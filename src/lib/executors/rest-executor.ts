import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Tool, Parameter } from '@prisma/client';
import { ToolExecutionResult } from '@/app/servers/[id]/tools/[toolId]/test/actions';
import { createServerLogger } from '@/lib/logger';
import { replaceInString, replaceInObject } from '@/lib/parameter-substitution';

const REQUEST_TIMEOUT_MS = 30000;

interface ToolWithParams extends Omit<Tool, 'serverId'> {
  parameters: Parameter[];
  serverId: string;
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
    url = replaceInString(url, parameters);

    // Replace parameters in headers
    const processedHeaders = replaceInObject(headers, parameters);

    // Replace parameters in body
    let processedBody = body;
    if (body) {
      if (typeof body === 'string') {
        processedBody = replaceInString(body, parameters);
        // Try to parse as JSON if it looks like JSON
        if (processedBody.trim().startsWith('{') || processedBody.trim().startsWith('[')) {
          try {
            processedBody = JSON.parse(processedBody);
          } catch {
            // Keep as string if JSON parsing fails
          }
        }
      } else {
        processedBody = replaceInObject(body, parameters);
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
