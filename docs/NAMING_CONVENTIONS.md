# 🏷️ Yasban Naming Conventions - Complete Guide

**Last Updated**: 2025-10-09
**Status**: Official Standard for Phase 1

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Server Names](#-server-names)
3. [Connection Names](#-connection-names)
4. [Tool Names](#-tool-names)
5. [Parameter Names](#-parameter-names)
6. [Return Types & Response Fields](#-return-types--response-fields)
7. [Prompt Names](#-prompt-names-phase-2)
8. [Resource Names](#-resource-names-phase-2)
9. [Environment Variable Names](#-environment-variable-names)
10. [Database Schema Conventions](#-database-schema-conventions)
11. [Validation Rules](#-validation-rules)
12. [Quick Reference Table](#-quick-reference-table)

---

## 🎯 Overview

Yasban follows flexible, user-friendly naming conventions aligned with MCP protocol standards while accommodating different programming language ecosystems. Our conventions balance:

- ✅ **MCP Protocol Compatibility** - Works with all MCP clients
- ✅ **Developer Familiarity** - Follows language-specific conventions
- ✅ **User Freedom** - Allows both camelCase and snake_case where appropriate
- ✅ **Consistency** - Clear rules for each component type

**Philosophy**: "Flexible where possible, strict where necessary."

---

## 🖥️ Server Names

**Convention**: `kebab-case`
**Format**: Lowercase letters, numbers, and hyphens only

### Rules
- Must start with a lowercase letter
- Must end with a letter or number
- Length: 3-50 characters
- No consecutive hyphens (`--`)
- Only characters: `a-z`, `0-9`, `-`

### Examples

```typescript
// ✅ GOOD
"postgres-production"
"mysql-analytics"
"rest-api-stripe"
"sqlserver-crm-db"
"sqlite-local"
"api-v2"

// ❌ BAD
"postgres_production"    // snake_case not allowed
"PostgresProduction"     // PascalCase not allowed
"postgresProduction"     // camelCase not allowed
"postgres--prod"         // consecutive hyphens
"1-postgres"             // starts with number
```

### Why kebab-case?
- URL-friendly (no special encoding needed)
- Easy to read
- MCP standard for server identifiers
- Works well in file paths

### Validation Regex
```typescript
/^[a-z][a-z0-9-]*[a-z0-9]$/
```

---

## 🔗 Connection Names

**Convention**: `kebab-case`
**Format**: Same as server names (Yasban-specific, not MCP spec)

### Rules
- Must start with a lowercase letter
- Must end with a letter or number
- Length: 3-50 characters
- No consecutive hyphens
- Only characters: `a-z`, `0-9`, `-`

### Recommended Patterns

```typescript
// ✅ Pattern 1: Type + Environment
"postgres-prod"
"mysql-dev"
"sqlserver-staging"

// ✅ Pattern 2: Type + Service + Environment
"postgres-crm-production"
"mysql-ecommerce-staging"
"sqlserver-analytics-dev"

// ✅ Pattern 3: Type + Region (if applicable)
"postgres-us-east-1"
"postgres-eu-west-1"

// ✅ Pattern 4: REST API connections
"rest-api-stripe"
"rest-api-github"
"rest-api-sendgrid"

// ❌ BAD
"postgres_prod"          // snake_case
"PostgresProd"           // PascalCase
"my connection"          // spaces not allowed
```

### Why kebab-case?
- Consistency with server names
- Easy to reference in tool configs
- Readable and professional

### Validation Regex
```typescript
/^[a-z][a-z0-9-]*[a-z0-9]$/
```

---

## 🔧 Tool Names

**Convention**: `snake_case`
**Format**: Lowercase letters, numbers, and underscores only

### Rules
- Must start with a lowercase letter
- Must end with a letter or number
- Length: 3-64 characters
- No consecutive underscores (`__`)
- Only characters: `a-z`, `0-9`, `_`

### Why snake_case?
- **Official MCP standard** for tool names
- Function-like naming (tools are callable functions)
- Used by all official MCP servers
- Easy to read

### Naming Patterns

#### A. CRUD Operations
```typescript
// ✅ Action + Entity
"create_user"
"get_user"
"update_user"
"delete_user"
"list_users"           // Plural for listing multiple

"create_order"
"get_order"
"update_order"
"delete_order"
"list_orders"
```

#### B. Query/Search Operations
```typescript
// ✅ Verb + Criteria
"search_customers"
"query_orders_by_date"
"find_user_by_email"
"list_active_subscriptions"
"get_recent_transactions"
"fetch_pending_invoices"
```

#### C. Action Operations
```typescript
// ✅ Verb + Object
"send_email"
"process_payment"
"generate_report"
"export_data"
"import_users"
"validate_address"
"calculate_total"
```

#### D. Batch Operations
```typescript
// ✅ Use plural for batch operations
"create_users"         // Multiple users
"delete_orders"        // Multiple orders
"update_products"      // Multiple products
```

### Common Verbs by Operation Type

| Operation | Verbs |
|-----------|-------|
| Create | `create`, `add`, `insert`, `register` |
| Read | `get`, `fetch`, `list`, `search`, `query`, `find`, `retrieve` |
| Update | `update`, `modify`, `edit`, `patch`, `change` |
| Delete | `delete`, `remove`, `destroy`, `clear` |
| Action | `send`, `process`, `generate`, `export`, `import`, `validate`, `calculate` |

### Examples

```typescript
// ✅ GOOD - Clear and descriptive
"get_customer_orders"
"search_products_by_category"
"send_welcome_email"
"calculate_shipping_cost"
"generate_monthly_report"

// ❌ BAD - Wrong naming style
"getCustomerOrders"      // camelCase not allowed
"get-customer-orders"    // kebab-case not allowed
"GetCustomerOrders"      // PascalCase not allowed
"GET_CUSTOMER_ORDERS"    // UPPER_SNAKE_CASE not allowed

// ❌ BAD - Too generic
"get"                    // Too vague
"data"                   // What data?
"process"                // Process what?

// ❌ BAD - Too verbose
"get_all_customer_orders_from_database_with_details"  // Too long
```

### Validation Regex
```typescript
/^[a-z][a-z0-9_]*[a-z0-9]$/
```

---

## 📝 Parameter Names

**Convention**: `camelCase` OR `snake_case` (User Choice)
**Format**: Flexible - supports both conventions

### Rules
- Must start with a lowercase letter
- Length: 1-64 characters
- **camelCase**: `a-z`, then `a-zA-Z0-9`
- **snake_case**: `a-z`, `0-9`, `_` (no consecutive `__`)
- No hyphens, no spaces

### Why flexible?
- Real-world MCP servers use both (60% camelCase, 30% snake_case)
- Language ecosystem matters (JavaScript vs Python)
- SQL consistency (match database column names)
- User preference (let developers choose)

### When to Use camelCase

```typescript
// ✅ REST API Tools (JSON convention)
{
  "userId": "string",
  "emailAddress": "string",
  "firstName": "string",
  "lastName": "string",
  "createdAt": "string",
  "isActive": "boolean"
}

// ✅ JavaScript/TypeScript Tools
{
  "maxResults": "number",
  "pageSize": "number",
  "sortOrder": "string",
  "includeTotals": "boolean"
}

// ✅ General API Integrations
{
  "apiKey": "string",
  "baseUrl": "string",
  "timeout": "number"
}
```

### When to Use snake_case

```typescript
// ✅ SQL Tools (matches SQL column names)
{
  "user_id": "string",
  "email_address": "string",
  "first_name": "string",
  "last_name": "string",
  "created_at": "string",
  "is_active": "boolean"
}

// ✅ Python-based Tools (PEP 8 convention)
{
  "max_results": "number",
  "page_size": "number",
  "sort_order": "string",
  "include_totals": "boolean"
}

// ✅ Database-heavy Operations
{
  "table_name": "string",
  "column_name": "string",
  "where_clause": "string"
}
```

### Parameter Naming Patterns

#### ID Fields
```typescript
// ✅ camelCase
"userId", "orderId", "customerId", "productId"

// ✅ snake_case
"user_id", "order_id", "customer_id", "product_id"

// ❌ BAD
"userid", "UserID", "user-id"
```

#### Date/Time Fields
```typescript
// ✅ camelCase
"createdAt", "updatedAt", "deletedAt", "startDate", "endDate"

// ✅ snake_case
"created_at", "updated_at", "deleted_at", "start_date", "end_date"

// ❌ BAD
"created_date", "creation_time", "date_created"
```

#### Boolean Fields
```typescript
// ✅ camelCase - use 'is', 'has', 'should' prefix
"isActive", "hasPermission", "shouldNotify", "includeDeleted"

// ✅ snake_case
"is_active", "has_permission", "should_notify", "include_deleted"

// ❌ BAD
"active", "permission", "notify"  // Unclear if boolean
```

#### Array/Collection Fields
```typescript
// ✅ camelCase - use plural
"userIds", "tags", "filters", "categories"

// ✅ snake_case
"user_ids", "tag_names", "filter_values", "category_ids"
```

#### Enum Fields
```typescript
// ✅ camelCase
"sortOrder"    // values: "asc", "desc"
"status"       // values: "active", "inactive", "pending"
"orderBy"      // values: "name", "date", "price"

// ✅ snake_case
"sort_order", "status_code", "order_by"
```

#### Pagination Parameters
```typescript
// ✅ camelCase
"page", "pageSize", "offset", "limit", "cursor"

// ✅ snake_case
"page", "page_size", "offset", "limit", "cursor"

// ❌ BAD
"page_number", "per_page", "results_per_page"  // Too verbose
```

### Validation Regex
```typescript
// Accepts BOTH camelCase and snake_case
/^[a-z][a-zA-Z0-9_]*$/

// Reject consecutive underscores
!/__/.test(paramName)
```

### Examples

```typescript
// ✅ GOOD - camelCase
"userId", "firstName", "emailAddress", "maxResults", "createdAt"

// ✅ GOOD - snake_case
"user_id", "first_name", "email_address", "max_results", "created_at"

// ❌ BAD
"user-id"           // kebab-case not allowed
"UserId"            // PascalCase not allowed
"user__id"          // consecutive underscores
"user id"           // spaces not allowed
```

---

## 🎁 Return Types & Response Fields

**Convention**: `camelCase` (JSON Schema Standard)
**Format**: Follows JSON/REST API conventions

### Rules
- Response fields use camelCase
- Matches parameter naming for consistency when applicable
- Standard MCP response structure

### Standard Response Format

```typescript
// MCP Tool Response Structure
{
  "content": [
    {
      "type": "text",
      "text": "Response message here"
    }
  ],
  "isError": false  // ✅ camelCase
}

// With metadata (Yasban extension)
{
  "content": [...],
  "metadata": {
    "executionTime": 1234,        // ✅ camelCase
    "rowCount": 100,               // ✅ camelCase
    "page": 1,
    "pageSize": 100,
    "totalRows": 5000,
    "hasMore": true,
    "nextPage": 2
  }
}
```

### Response Field Examples

```typescript
// ✅ GOOD - Standard fields
{
  "success": true,
  "data": {...},
  "message": "Operation completed",
  "timestamp": "2025-01-08T10:30:00Z",
  "metadata": {
    "requestId": "req_123",
    "executionTime": 1234,
    "affectedRows": 10
  }
}

// ✅ GOOD - Pagination metadata
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalPages": 10,
    "totalRecords": 1000,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}

// ✅ GOOD - Error responses
{
  "isError": true,
  "errorCode": "VALIDATION_ERROR",
  "errorMessage": "Invalid user ID",
  "errorDetails": {
    "field": "userId",
    "reason": "Must be a valid UUID"
  }
}
```

### Why camelCase for responses?
- JSON convention (standard in REST APIs)
- JavaScript ecosystem expectation
- Matches most MCP client expectations
- Consistency with MCP SDK response format

---

## 💬 Prompt Names (Phase 2)

**Convention**: `snake_case`
**Format**: Same as tool names (consistency with MCP primitives)

### Rules
- Must start with a lowercase letter
- Length: 3-64 characters
- No consecutive underscores
- Only characters: `a-z`, `0-9`, `_`

### Examples

```typescript
// ✅ GOOD - Action-based prompts
"code_review"
"summarize_document"
"debug_error"
"analyze_performance"
"explain_concept"

// ✅ GOOD - Template-based prompts
"email_template_welcome"
"email_template_invoice"
"report_template_weekly"
"review_template_pr"

// ❌ BAD
"codeReview"           // camelCase
"code-review"          // kebab-case
"CodeReview"           // PascalCase
```

### Why snake_case?
- Consistency with tool names
- MCP convention for primitives
- Easy to distinguish from parameters

---

## 🗂️ Resource Names (Phase 2)

**Convention**: `kebab-case` in URI paths
**Format**: URI-like structure with kebab-case

### Rules
- Follow URI/URL naming conventions
- Use kebab-case for path segments
- Support templating with `{variable}`

### Examples

```typescript
// ✅ GOOD - File resources
"file://documents/readme.md"
"file://config/settings.json"
"file://src/components/button.tsx"

// ✅ GOOD - Database resources
"postgres://prod/customers/table"
"mysql://analytics/orders"
"sqlite://local/users"

// ✅ GOOD - HTTP resources
"https://api.example.com/v1/users/{userId}"
"https://docs.example.com/api/reference"

// ✅ GOOD - Custom resources
"memory://conversations/{conversationId}"
"cache://keys/{keyPattern}"
```

### Why kebab-case in URIs?
- Standard URL convention
- SEO-friendly
- Easy to read

---

## 🌍 Environment Variable Names

**Convention**: `UPPER_SNAKE_CASE`
**Format**: Uppercase letters, numbers, and underscores only

### Rules
- All uppercase letters
- Use underscores to separate words
- Descriptive and clear
- Prefix with `YASBAN_` for Yasban-specific vars

### Examples

```bash
# ✅ GOOD - Database connections
DATABASE_URL="postgresql://..."
MYSQL_HOST="localhost"
POSTGRES_PASSWORD="secret"
SQL_SERVER_PORT=1433

# ✅ GOOD - API credentials
API_KEY="sk_live_..."
API_SECRET="..."
GITHUB_TOKEN="ghp_..."
STRIPE_SECRET_KEY="sk_test_..."

# ✅ GOOD - Yasban-specific
YASBAN_SERVER_ID="srv_123"
YASBAN_LOG_LEVEL="info"
YASBAN_MAX_ROWS=1000
YASBAN_TIMEOUT=30000

# ✅ GOOD - Feature flags
ENABLE_HOT_RELOAD=true
ENABLE_TELEMETRY=false
DEBUG_MODE=false

# ❌ BAD
databaseUrl          // Not uppercase
DATABASE-URL         // Hyphens not allowed
yasban.server.id     // Dots not allowed
```

### Why UPPER_SNAKE_CASE?
- Universal convention for environment variables
- Easy to distinguish from code variables
- Shell/OS standard

---

## 💾 Database Schema Conventions

### Yasban Internal Database (SQLite)

#### Table Names: `PascalCase` (Prisma convention)
```prisma
model Server {
  id          String   @id @default(uuid())
  name        String   @unique
  status      String
}

model Tool {
  id          String   @id
  serverId    String
  name        String
}
```

#### Column Names: `camelCase` (Prisma/JavaScript convention)
```prisma
model Tool {
  id          String      @id
  serverId    String      // ✅ camelCase
  toolName    String      // ✅ camelCase
  createdAt   DateTime    // ✅ camelCase
  updatedAt   DateTime    // ✅ camelCase
}
```

### Why?
- Prisma ORM convention
- Maps cleanly to JavaScript objects
- Consistent with Next.js/TypeScript ecosystem

---

## ✅ Validation Rules

### Implementation in Yasban

```typescript
// src/lib/validation.ts
import { z } from 'zod';

// Server Name Validation
export const serverNameSchema = z
  .string()
  .min(3, "Server name must be at least 3 characters")
  .max(50, "Server name must be at most 50 characters")
  .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
    message: "Server name must be kebab-case (lowercase, numbers, hyphens only)"
  })
  .refine(val => !val.includes('--'), {
    message: "Server name cannot contain consecutive hyphens"
  });

// Connection Name Validation
export const connectionNameSchema = serverNameSchema; // Same rules

// Tool Name Validation
export const toolNameSchema = z
  .string()
  .min(3, "Tool name must be at least 3 characters")
  .max(64, "Tool name must be at most 64 characters")
  .regex(/^[a-z][a-z0-9_]*[a-z0-9]$/, {
    message: "Tool name must be snake_case (lowercase, numbers, underscores only)"
  })
  .refine(val => !val.includes('__'), {
    message: "Tool name cannot contain consecutive underscores"
  });

// Parameter Name Validation (Flexible - accepts both)
export const parameterNameSchema = z
  .string()
  .min(1, "Parameter name is required")
  .max(64, "Parameter name must be at most 64 characters")
  .regex(/^[a-z][a-zA-Z0-9_]*$/, {
    message: "Parameter name must be camelCase or snake_case"
  })
  .refine(val => !val.includes('__'), {
    message: "Parameter name cannot contain consecutive underscores"
  });

// Prompt Name Validation (Phase 2)
export const promptNameSchema = toolNameSchema; // Same as tool names

// Examples of usage
serverNameSchema.parse("postgres-prod");      // ✅ Valid
serverNameSchema.parse("PostgresProd");       // ❌ Throws error

toolNameSchema.parse("get_user_data");        // ✅ Valid
toolNameSchema.parse("getUserData");          // ❌ Throws error

parameterNameSchema.parse("userId");          // ✅ Valid
parameterNameSchema.parse("user_id");         // ✅ Valid
parameterNameSchema.parse("user-id");         // ❌ Throws error
```

---

## 📊 Quick Reference Table

| Component | Convention | Example | Regex | Why? |
|-----------|-----------|---------|-------|------|
| **Server Name** | `kebab-case` | `postgres-prod` | `/^[a-z][a-z0-9-]*[a-z0-9]$/` | URL-friendly, MCP standard |
| **Connection Name** | `kebab-case` | `mysql-staging` | `/^[a-z][a-z0-9-]*[a-z0-9]$/` | Consistency with servers |
| **Tool Name** | `snake_case` | `get_user_data` | `/^[a-z][a-z0-9_]*[a-z0-9]$/` | MCP official standard |
| **Parameter Name** | `camelCase` OR `snake_case` | `userId` or `user_id` | `/^[a-z][a-zA-Z0-9_]*$/` | Flexible (user choice) |
| **Response Fields** | `camelCase` | `isError`, `createdAt` | `/^[a-z][a-zA-Z0-9]*$/` | JSON standard |
| **Prompt Name** | `snake_case` | `code_review` | `/^[a-z][a-z0-9_]*[a-z0-9]$/` | MCP convention |
| **Resource URI** | `kebab-case` | `file://docs/readme.md` | URI format | URL standard |
| **Environment Var** | `UPPER_SNAKE_CASE` | `DATABASE_URL` | `/^[A-Z][A-Z0-9_]*$/` | OS/Shell standard |
| **Database Table** | `PascalCase` | `Server`, `Tool` | N/A | Prisma convention |
| **Database Column** | `camelCase` | `serverId`, `createdAt` | N/A | Prisma/JS convention |

---

## 🎨 UI Guidelines

### Wizard Step 1: Server/Connection Naming
```typescript
<Input
  label="Server Name"
  placeholder="postgres-production"
  helperText="Use kebab-case: lowercase letters, numbers, hyphens"
  validation={serverNameSchema}
/>
```

### Wizard Step 2: Tool Naming
```typescript
<Input
  label="Tool Name"
  placeholder="get_customer_orders"
  helperText="Use snake_case: lowercase letters, numbers, underscores"
  validation={toolNameSchema}
/>
```

### Wizard Step 3: Parameter Naming
```typescript
<div>
  <Label>Parameter Naming Style</Label>
  <RadioGroup value={namingStyle}>
    <RadioGroupItem value="camelCase">
      <strong>camelCase</strong>
      <p>Recommended for REST APIs, JavaScript</p>
      <code>userId, firstName, createdAt</code>
    </RadioGroupItem>

    <RadioGroupItem value="snake_case">
      <strong>snake_case</strong>
      <p>Recommended for SQL, Python</p>
      <code>user_id, first_name, created_at</code>
    </RadioGroupItem>
  </RadioGroup>

  <Alert>
    💡 Both styles are valid in MCP. Choose based on your backend.
  </Alert>
</div>
```

---

## 🔄 Migration & Compatibility

### Handling Legacy Names

If users have existing MCP servers with different naming:

```typescript
// Yasban should ACCEPT any valid parameter names
// Don't force users to rename existing parameters

// Import validation - be lenient
export function validateImportedParameter(name: string): boolean {
  // Accept camelCase
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return true;

  // Accept snake_case
  if (/^[a-z][a-z0-9_]*$/.test(name) && !/__/.test(name)) return true;

  // Accept kebab-case (convert to snake_case on import)
  if (/^[a-z][a-z0-9-]*$/.test(name)) {
    console.warn(`Parameter "${name}" uses kebab-case. Consider snake_case or camelCase.`);
    return true;
  }

  return false;
}
```

---

## ✅ Best Practices Summary

### DO:
- ✅ Use kebab-case for servers and connections
- ✅ Use snake_case for tool names (MCP standard)
- ✅ Choose camelCase OR snake_case for parameters (be consistent within a server)
- ✅ Match SQL column names when creating SQL tools
- ✅ Use descriptive, clear names
- ✅ Follow language ecosystem conventions (Python → snake_case, JS → camelCase)
- ✅ Validate names in the UI wizard
- ✅ Provide examples and help text

### DON'T:
- ❌ Mix naming styles within the same server
- ❌ Use spaces or special characters (except `-` and `_` where allowed)
- ❌ Start names with numbers
- ❌ Use consecutive hyphens or underscores
- ❌ Use generic names like `data`, `get`, `process`
- ❌ Make names too long (>64 characters for tools/params)
- ❌ Use PascalCase or UPPER_CASE (except for env vars)

---

## 📚 References

- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **MCP GitHub**: https://github.com/modelcontextprotocol
- **JSON Schema Conventions**: https://json-schema.org/
- **PEP 8 (Python)**: https://peps.python.org/pep-0008/
- **JavaScript Style Guide**: https://github.com/airbnb/javascript

---

## 📝 Changelog

### Version 1.0 (2025-10-09)
- Initial naming conventions document
- Defined standards for all Yasban components
- Added flexible parameter naming (camelCase OR snake_case)
- Included validation rules and examples
- Added UI guidelines and best practices

---

**This document is the official naming standard for Yasban Phase 1. All code, UI, and documentation should follow these conventions.**

---

**Maintained By**: Yasban Core Team
**License**: MIT
**Last Updated**: 2025-10-09
