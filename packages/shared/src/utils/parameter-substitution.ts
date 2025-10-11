/**
 * Parameter Substitution Utility
 *
 * Provides centralized parameter template replacement for MCP tool executors.
 * Supports multiple parameter placeholder patterns for flexibility and compatibility.
 *
 * @module parameter-substitution
 */

/**
 * Supported parameter placeholder patterns:
 * - {{paramName}} - Double curly braces (Handlebars/Mustache style)
 * - ${paramName}  - Dollar sign with braces (JavaScript template literal style)
 * - $paramName    - Dollar sign only (PostgreSQL/Shell style)
 *
 * @example
 * ```typescript
 * replaceInString('Hello {{name}}!', { name: 'World' })
 * // Returns: 'Hello World!'
 *
 * replaceInString('User ID: $id, Name: ${name}', { id: 123, name: 'John' })
 * // Returns: 'User ID: 123, Name: John'
 * ```
 */

/**
 * Replace parameter placeholders in a string with actual values.
 *
 * All three placeholder patterns are supported and can be mixed in the same template.
 * Parameters are converted to strings using String(value).
 *
 * @param template - The template string containing parameter placeholders
 * @param parameters - Object mapping parameter names to their values
 * @returns The template with all placeholders replaced by actual values
 *
 * @example
 * ```typescript
 * // SQL query example
 * const sql = 'SELECT * FROM users WHERE id = {{user_id}}';
 * const result = replaceInString(sql, { user_id: 123 });
 * // Returns: 'SELECT * FROM users WHERE id = 123'
 *
 * // REST URL example
 * const url = 'https://api.example.com/users/${userId}/posts';
 * const result = replaceInString(url, { userId: 456 });
 * // Returns: 'https://api.example.com/users/456/posts'
 *
 * // Mixed patterns
 * const mixed = 'ID: $id, Name: {{name}}, Email: ${email}';
 * const result = replaceInString(mixed, { id: 1, name: 'John', email: 'john@example.com' });
 * // Returns: 'ID: 1, Name: John, Email: john@example.com'
 * ```
 */
export function replaceInString(
  template: string,
  parameters: Record<string, any>
): string {
  let result = template;

  for (const [key, value] of Object.entries(parameters)) {
    // Create regex patterns for all three placeholder styles
    const patterns = [
      new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g'),      // {{paramName}}
      new RegExp(`\\$\\{${escapeRegExp(key)}\\}`, 'g'),         // ${paramName}
      new RegExp(`\\$${escapeRegExp(key)}\\b`, 'g'),            // $paramName (with word boundary)
    ];

    // Replace all occurrences of each pattern
    patterns.forEach((regex) => {
      result = result.replace(regex, String(value));
    });
  }

  return result;
}

/**
 * Recursively replace parameter placeholders in objects, arrays, and strings.
 *
 * This function walks through the entire object structure and applies parameter
 * substitution to all string values, regardless of nesting level.
 *
 * @param obj - The object, array, string, or primitive value to process
 * @param parameters - Object mapping parameter names to their values
 * @returns A new object/array/string with all placeholders replaced
 *
 * @example
 * ```typescript
 * // Nested object example
 * const config = {
 *   url: 'https://api.example.com/{{resource}}',
 *   headers: {
 *     'Authorization': 'Bearer ${token}',
 *     'X-User-ID': '$userId'
 *   },
 *   body: {
 *     name: '{{name}}',
 *     items: [
 *       { id: '{{item1}}', price: 100 },
 *       { id: '{{item2}}', price: 200 }
 *     ]
 *   }
 * };
 *
 * const params = {
 *   resource: 'users',
 *   token: 'abc123',
 *   userId: '456',
 *   name: 'John',
 *   item1: 'PROD-1',
 *   item2: 'PROD-2'
 * };
 *
 * const result = replaceInObject(config, params);
 * // Returns:
 * // {
 * //   url: 'https://api.example.com/users',
 * //   headers: {
 * //     'Authorization': 'Bearer abc123',
 * //     'X-User-ID': '456'
 * //   },
 * //   body: {
 * //     name: 'John',
 * //     items: [
 * //       { id: 'PROD-1', price: 100 },
 * //       { id: 'PROD-2', price: 200 }
 * //     ]
 * //   }
 * // }
 * ```
 */
export function replaceInObject(
  obj: any,
  parameters: Record<string, any>
): any {
  // Base case: string - apply template replacement
  if (typeof obj === 'string') {
    return replaceInString(obj, parameters);
  }

  // Base case: array - recursively process each element
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceInObject(item, parameters));
  }

  // Base case: object - recursively process each property
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = replaceInObject(value, parameters);
    });
    return result;
  }

  // Base case: primitives (number, boolean, null, undefined) - return as-is
  return obj;
}

/**
 * Escape special regex characters in a string.
 *
 * This ensures that parameter names containing special regex characters
 * (like dots, brackets, etc.) are properly escaped when used in regex patterns.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in regex
 *
 * @internal
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
