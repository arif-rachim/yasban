import type { ToolExecutionResult, ToolWithServerId } from '../types/common.js';
import { createServerLogger } from '../utils/logger.js';
import { parseToolConfig, type JavaScriptToolConfig } from '../types/tool-config.js';

const EXECUTION_TIMEOUT_MS = 5000;

/**
 * Execute JavaScript tool
 *
 * Phase 1 Implementation:
 * - Uses Function constructor for limited sandboxing
 * - 5-second timeout protection
 * - Simple transformation/computation functions only
 *
 * Phase 2 Enhancement:
 * - Upgrade to isolated-vm for proper sandboxing
 * - Support full custom JavaScript tools
 */
export async function executeJavaScriptTool(
  tool: ToolWithServerId,
  parameters: Record<string, any>
): Promise<ToolExecutionResult> {
  const logger = createServerLogger(tool.serverId);
  const startTime = Date.now();

  // Parse config to get code
  let config: JavaScriptToolConfig;
  try {
    config = parseToolConfig('javascript', tool.config) as JavaScriptToolConfig;
  } catch (err) {
    logger.error('JavaScript tool execution failed - invalid configuration', {
      toolId: tool.id,
      toolName: tool.name,
    });
    return {
      success: false,
      error: 'Invalid JavaScript configuration',
    };
  }

  const code = config.code || '';

  if (!code) {
    logger.error('JavaScript tool execution failed - no code', {
      toolId: tool.id,
      toolName: tool.name,
    });
    return {
      success: false,
      error: 'No JavaScript code configured',
    };
  }

  logger.info('Executing JavaScript tool', {
    toolId: tool.id,
    toolName: tool.name,
    parameters,
  });

  try {
    // Create a sandboxed function
    // WARNING: This is a basic sandbox using Function constructor.
    // For production use, consider upgrading to isolated-vm (Phase 2).
    //
    // The Function constructor creates a function with:
    // - Parameter 'params' containing the input parameters
    // - The user's code as the function body
    // - Limited access to global scope (safer than eval)
    const func = new Function('params', code);

    // Execute with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Execution timeout (${EXECUTION_TIMEOUT_MS / 1000}s)`)),
        EXECUTION_TIMEOUT_MS
      );
    });

    const executionPromise = Promise.resolve(func(parameters));

    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise]);

    const duration = Date.now() - startTime;

    logger.info('✓ JavaScript tool execution successful', {
      toolId: tool.id,
      toolName: tool.name,
      duration,
    });

    return {
      success: true,
      data: result,
      executionTime: duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('✗ JavaScript tool execution failed', {
      toolId: tool.id,
      toolName: tool.name,
      duration,
      error: error.message,
    });

    return {
      success: false,
      error: error.message || 'JavaScript execution failed',
      executionTime: duration,
    };
  }
}
