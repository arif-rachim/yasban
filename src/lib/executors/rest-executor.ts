import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Tool, Parameter } from '@prisma/client';
import { ToolExecutionResult } from '@/app/servers/[id]/tools/[toolId]/test/actions';
import { createServerLogger } from '@/lib/logger';

const REQUEST_TIMEOUT_MS = 30000;

interface ToolWithParams extends Omit<Tool, 'serverId'> {
  parameters: Parameter[];
  serverId: string;
}

/**
 * Replace parameter placeholders in a string with actual values
 * Supports: $paramName, ${paramName}, and {{paramName}} syntax
 */
function replaceParameterPlaceholders(
  text: string,
  parameters: Record<string, any>
): string {
  let result = text;

  Object.entries(parameters).forEach(([name, value]) => {
    // Match $paramName, ${paramName}, or {{paramName}}
    const patterns = [
      new RegExp(`\\$${name}\\b`, 'g'),           // $paramName
      new RegExp(`\\$\\{${name}\\}`, 'g'),        // ${paramName}
      new RegExp(`\\{\\{${name}\\}\\}`, 'g'),     // {{paramName}}
    ];

    patterns.forEach((regex) => {
      result = result.replace(regex, String(value));
    });
  });

  return result;
}

/**
 * Replace parameter placeholders in JSON object recursively
 */
function replaceParametersInObject(
  obj: any,
  parameters: Record<string, any>
): any {
  if (typeof obj === 'string') {
    return replaceParameterPlaceholders(obj, parameters);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replaceParametersInObject(item, parameters));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = replaceParametersInObject(value, parameters);
    });
    return result;
  }

  return obj;
}

/**
 * Execute REST API tool
 */
export async function executeRESTTool(
  tool: ToolWithParams,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const logger = createServerLogger(tool.serverId);
  const startTime = Date.now();
  const config = tool.config as any;

  if (!config) {
    logger.error('REST tool execution failed - no configuration', {
      toolId: tool.id,
      toolName: tool.name,
    });
    return {
      success: false,
      error: 'No REST API configuration found',
    };
  }

  try {
    // Extract configuration
    const method = (config.method || 'GET').toUpperCase();
    let url = config.url || '';
    const headers = config.headers || {};
    let body = config.body;

    // Replace parameters in URL
    url = replaceParameterPlaceholders(url, parameters);

    // Replace parameters in headers
    const processedHeaders = replaceParametersInObject(headers, parameters);

    // Replace parameters in body
    let processedBody = body;
    if (body) {
      if (typeof body === 'string') {
        processedBody = replaceParameterPlaceholders(body, parameters);
        // Try to parse as JSON if it looks like JSON
        if (processedBody.trim().startsWith('{') || processedBody.trim().startsWith('[')) {
          try {
            processedBody = JSON.parse(processedBody);
          } catch {
            // Keep as string if JSON parsing fails
          }
        }
      } else {
        processedBody = replaceParametersInObject(body, parameters);
      }
    }

    logger.info('Executing REST tool', {
      toolId: tool.id,
      toolName: tool.name,
      method,
      url,
      parameters,
    });

    // Build axios config
    const axiosConfig: AxiosRequestConfig = {
      method: method as any,
      url,
      headers: processedHeaders,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true, // Accept any status code
    };

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(method) && processedBody) {
      axiosConfig.data = processedBody;
    }

    // Make request
    const response: AxiosResponse = await axios(axiosConfig);
    const duration = Date.now() - startTime;

    // Format response
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    };

    const success = response.status >= 200 && response.status < 300;

    if (success) {
      logger.info('✓ REST tool execution successful', {
        toolId: tool.id,
        toolName: tool.name,
        duration,
        status: response.status,
      });
    } else {
      logger.warn('REST tool returned error status', {
        toolId: tool.id,
        toolName: tool.name,
        duration,
        status: response.status,
        statusText: response.statusText,
      });
    }

    return {
      success,
      data: responseData,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Handle axios errors
    if (error.response) {
      // Server responded with error status
      logger.error('✗ REST tool execution failed - server error', {
        toolId: tool.id,
        toolName: tool.name,
        duration,
        status: error.response.status,
        error: error.message,
      });

      return {
        success: false,
        data: {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
        },
        error: `HTTP ${error.response.status}: ${error.response.statusText}`,
      };
    } else if (error.request) {
      // Request made but no response
      logger.error('✗ REST tool execution failed - no response', {
        toolId: tool.id,
        toolName: tool.name,
        duration,
        error: 'No response received',
      });

      return {
        success: false,
        error: 'No response received from server (timeout or network error)',
      };
    } else {
      // Error in request setup
      logger.error('✗ REST tool execution failed - request setup', {
        toolId: tool.id,
        toolName: tool.name,
        duration,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Request setup failed',
      };
    }
  }
}
