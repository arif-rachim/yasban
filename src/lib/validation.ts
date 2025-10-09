/**
 * Yasban Naming Convention Validation
 *
 * Official validation schemas for all naming conventions in Yasban.
 * See docs/NAMING_CONVENTIONS.md for complete documentation.
 */

import { z } from 'zod';

// ============================================
// Server Name Validation (kebab-case)
// ============================================
export const serverNameSchema = z
  .string()
  .min(3, "Server name must be at least 3 characters")
  .max(50, "Server name must be at most 50 characters")
  .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
    message: "Server name must be kebab-case: start with lowercase letter, use only lowercase letters, numbers, and hyphens"
  })
  .refine(val => !val.includes('--'), {
    message: "Server name cannot contain consecutive hyphens (--)"
  });

// ============================================
// Connection Name Validation (kebab-case)
// ============================================
export const connectionNameSchema = z
  .string()
  .min(3, "Connection name must be at least 3 characters")
  .max(50, "Connection name must be at most 50 characters")
  .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
    message: "Connection name must be kebab-case: start with lowercase letter, use only lowercase letters, numbers, and hyphens"
  })
  .refine(val => !val.includes('--'), {
    message: "Connection name cannot contain consecutive hyphens (--)"
  });

// ============================================
// Tool Name Validation (snake_case)
// ============================================
export const toolNameSchema = z
  .string()
  .min(3, "Tool name must be at least 3 characters")
  .max(64, "Tool name must be at most 64 characters")
  .regex(/^[a-z][a-z0-9_]*[a-z0-9]$/, {
    message: "Tool name must be snake_case: start with lowercase letter, use only lowercase letters, numbers, and underscores"
  })
  .refine(val => !val.includes('__'), {
    message: "Tool name cannot contain consecutive underscores (__)"
  });

// ============================================
// Parameter Name Validation (camelCase OR snake_case - flexible)
// ============================================
export const parameterNameSchema = z
  .string()
  .min(1, "Parameter name is required")
  .max(64, "Parameter name must be at most 64 characters")
  .regex(/^[a-z][a-zA-Z0-9_]*$/, {
    message: "Parameter name must be camelCase or snake_case: start with lowercase letter, use letters, numbers, or underscores"
  })
  .refine(val => !val.includes('__'), {
    message: "Parameter name cannot contain consecutive underscores (__)"
  });

// ============================================
// Prompt Name Validation (snake_case - Phase 2)
// ============================================
export const promptNameSchema = z
  .string()
  .min(3, "Prompt name must be at least 3 characters")
  .max(64, "Prompt name must be at most 64 characters")
  .regex(/^[a-z][a-z0-9_]*[a-z0-9]$/, {
    message: "Prompt name must be snake_case: start with lowercase letter, use only lowercase letters, numbers, and underscores"
  })
  .refine(val => !val.includes('__'), {
    message: "Prompt name cannot contain consecutive underscores (__)"
  });

// ============================================
// Environment Variable Name Validation (UPPER_SNAKE_CASE)
// ============================================
export const envVarNameSchema = z
  .string()
  .min(1, "Environment variable name is required")
  .max(100, "Environment variable name must be at most 100 characters")
  .regex(/^[A-Z][A-Z0-9_]*$/, {
    message: "Environment variable must be UPPER_SNAKE_CASE: start with uppercase letter, use only uppercase letters, numbers, and underscores"
  })
  .refine(val => !val.includes('__'), {
    message: "Environment variable name cannot contain consecutive underscores (__)"
  });

// ============================================
// Helper Functions
// ============================================

/**
 * Detect naming style of a string
 */
export function detectNamingStyle(name: string): 'kebab-case' | 'snake_case' | 'camelCase' | 'PascalCase' | 'UPPER_SNAKE_CASE' | 'unknown' {
  if (/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) && name.includes('-')) return 'kebab-case';
  if (/^[a-z][a-z0-9_]*[a-z0-9]$/.test(name) && name.includes('_')) return 'snake_case';
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return 'camelCase';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase';
  if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'UPPER_SNAKE_CASE';
  return 'unknown';
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .replace(/-{2,}/g, '-');       // Replace consecutive hyphens with single
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscores
    .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
    .replace(/_{2,}/g, '_');        // Replace consecutive underscores with single
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, char => char.toLowerCase());
}

/**
 * Convert string to UPPER_SNAKE_CASE
 */
export function toUpperSnakeCase(str: string): string {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')  // Replace non-alphanumeric with underscores
    .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
    .replace(/_{2,}/g, '_');        // Replace consecutive underscores with single
}

/**
 * Convert string to kebab-case FOR LIVE TYPING (preserves trailing hyphens)
 * Use this while user is typing to allow natural hyphen input
 */
export function toLiveKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')          // Convert spaces to hyphens
    .replace(/[^a-z0-9-]/g, '')    // Remove invalid chars (keep hyphens)
    .replace(/-{2,}/g, '-');        // Collapse consecutive hyphens
  // NOTE: Does NOT remove leading/trailing hyphens (allow during typing)
}

/**
 * Convert string to snake_case FOR LIVE TYPING (preserves trailing underscores)
 * Use this while user is typing to allow natural underscore input
 */
export function toLiveSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '_')          // Convert spaces to underscores
    .replace(/[^a-z0-9_]/g, '')    // Remove invalid chars (keep underscores)
    .replace(/_{2,}/g, '_');        // Collapse consecutive underscores
  // NOTE: Does NOT remove leading/trailing underscores (allow during typing)
}

/**
 * Convert string to camelCase FOR LIVE TYPING (more lenient)
 */
export function toLiveCamelCase(str: string): string {
  // Allow typing naturally, only remove truly invalid characters
  return str
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove non-alphanumeric
    .replace(/^[A-Z]/, char => char.toLowerCase()); // Lowercase first char
}

/**
 * Validate and suggest correction for server name
 */
export function validateServerName(name: string): { valid: boolean; error?: string; suggestion?: string } {
  const result = serverNameSchema.safeParse(name);

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    error: result.error.errors[0]?.message || 'Invalid server name',
    suggestion: toKebabCase(name)
  };
}

/**
 * Validate and suggest correction for connection name
 */
export function validateConnectionName(name: string): { valid: boolean; error?: string; suggestion?: string } {
  const result = connectionNameSchema.safeParse(name);

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    error: result.error.errors[0]?.message || 'Invalid connection name',
    suggestion: toKebabCase(name)
  };
}

/**
 * Validate and suggest correction for tool name
 */
export function validateToolName(name: string): { valid: boolean; error?: string; suggestion?: string } {
  const result = toolNameSchema.safeParse(name);

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    error: result.error.errors[0]?.message || 'Invalid tool name',
    suggestion: toSnakeCase(name)
  };
}

/**
 * Validate parameter name (accepts both camelCase and snake_case)
 */
export function validateParameterName(name: string): { valid: boolean; error?: string; detectedStyle?: string } {
  const result = parameterNameSchema.safeParse(name);

  if (result.success) {
    const style = detectNamingStyle(name);
    return {
      valid: true,
      detectedStyle: style === 'camelCase' ? 'camelCase' : style === 'snake_case' ? 'snake_case' : 'unknown'
    };
  }

  return {
    valid: false,
    error: result.error.errors[0]?.message || 'Invalid parameter name'
  };
}

/**
 * Check if a parameter name matches a specific style
 */
export function parameterMatchesStyle(name: string, style: 'camelCase' | 'snake_case'): boolean {
  if (style === 'camelCase') {
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  } else {
    return /^[a-z][a-z0-9_]*$/.test(name) && !name.includes('__');
  }
}

/**
 * Validate imported parameter name (lenient for backwards compatibility)
 */
export function validateImportedParameter(name: string): { valid: boolean; warning?: string } {
  // Accept camelCase
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    return { valid: true };
  }

  // Accept snake_case
  if (/^[a-z][a-z0-9_]*$/.test(name) && !/__/.test(name)) {
    return { valid: true };
  }

  // Accept kebab-case with warning
  if (/^[a-z][a-z0-9-]*$/.test(name)) {
    return {
      valid: true,
      warning: `Parameter "${name}" uses kebab-case. Consider snake_case or camelCase for better compatibility.`
    };
  }

  return {
    valid: false
  };
}

/**
 * Suggest parameter naming style based on context
 */
export function suggestParameterStyle(context: {
  toolType?: 'sql' | 'rest' | 'webhook' | 'javascript';
  detectedSqlColumns?: string[];
  userPreference?: 'camelCase' | 'snake_case';
}): 'camelCase' | 'snake_case' {
  // User preference wins
  if (context.userPreference) {
    return context.userPreference;
  }

  // SQL tools: match SQL column naming
  if (context.toolType === 'sql' && context.detectedSqlColumns) {
    const hasSnakeCase = context.detectedSqlColumns.some(col => col.includes('_'));
    if (hasSnakeCase) return 'snake_case';
  }

  // REST API: JSON convention
  if (context.toolType === 'rest') {
    return 'camelCase';
  }

  // Default: camelCase (JSON Schema standard)
  return 'camelCase';
}

// ============================================
// Export all schemas and helpers
// ============================================
export const schemas = {
  serverName: serverNameSchema,
  connectionName: connectionNameSchema,
  toolName: toolNameSchema,
  parameterName: parameterNameSchema,
  promptName: promptNameSchema,
  envVarName: envVarNameSchema,
};

export const validators = {
  validateServerName,
  validateConnectionName,
  validateToolName,
  validateParameterName,
  validateImportedParameter,
};

export const converters = {
  toKebabCase,
  toSnakeCase,
  toCamelCase,
  toUpperSnakeCase,
  toLiveKebabCase,
  toLiveSnakeCase,
  toLiveCamelCase,
};

export const helpers = {
  detectNamingStyle,
  parameterMatchesStyle,
  suggestParameterStyle,
};
