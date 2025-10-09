import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed database with 10 built-in templates
 * Templates cover: SQL (PostgreSQL, MySQL, MSSQL, SQLite), REST API, Webhooks, JavaScript
 */

const templates = [
  // ============================================
  // SQL Templates
  // ============================================
  {
    name: 'PostgreSQL - Get Users',
    description: 'Simple SELECT query to retrieve all users from a PostgreSQL database. Great for getting started with SQL tools.',
    category: 'sql',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'sql',
      connectionType: 'postgresql',
      query: 'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 100',
      parameters: [],
      maxRows: 1000,
      timeout: 30000,
      readOnly: true,
    }),
  },

  {
    name: 'PostgreSQL - Search Users by Email',
    description: 'Parameterized SELECT query to search users by email pattern. Demonstrates safe parameter usage.',
    category: 'sql',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'sql',
      connectionType: 'postgresql',
      query: 'SELECT id, username, email, created_at FROM users WHERE email LIKE $1 ORDER BY created_at DESC LIMIT 50',
      parameters: [
        {
          name: 'email_pattern',
          type: 'string',
          description: 'Email pattern to search for (e.g., %@gmail.com)',
          required: true,
        },
      ],
      maxRows: 1000,
      timeout: 30000,
      readOnly: true,
    }),
  },

  {
    name: 'MySQL - Get Order Details',
    description: 'JOIN query to retrieve order details with customer information from MySQL database.',
    category: 'sql',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'sql',
      connectionType: 'mysql',
      query: `SELECT
  o.order_id,
  o.order_date,
  o.total_amount,
  c.customer_name,
  c.email
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= ?
ORDER BY o.order_date DESC
LIMIT 100`,
      parameters: [
        {
          name: 'start_date',
          type: 'string',
          description: 'Start date (YYYY-MM-DD format)',
          required: true,
        },
      ],
      maxRows: 1000,
      timeout: 30000,
      readOnly: true,
    }),
  },

  {
    name: 'SQL Server - Get Sales Report',
    description: 'Aggregate query to generate sales summary report from SQL Server database.',
    category: 'sql',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'sql',
      connectionType: 'mssql',
      query: `SELECT
  DATEPART(year, sale_date) AS year,
  DATEPART(month, sale_date) AS month,
  COUNT(*) AS total_sales,
  SUM(amount) AS total_revenue,
  AVG(amount) AS avg_sale_amount
FROM sales
WHERE sale_date >= @start_date AND sale_date <= @end_date
GROUP BY DATEPART(year, sale_date), DATEPART(month, sale_date)
ORDER BY year DESC, month DESC`,
      parameters: [
        {
          name: 'start_date',
          type: 'string',
          description: 'Report start date (YYYY-MM-DD)',
          required: true,
        },
        {
          name: 'end_date',
          type: 'string',
          description: 'Report end date (YYYY-MM-DD)',
          required: true,
        },
      ],
      maxRows: 1000,
      timeout: 30000,
      readOnly: true,
    }),
  },

  {
    name: 'SQLite - Get Application Settings',
    description: 'Simple query to retrieve application configuration from SQLite database.',
    category: 'sql',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'sql',
      connectionType: 'sqlite',
      query: 'SELECT key, value, description, updated_at FROM app_settings ORDER BY key',
      parameters: [],
      maxRows: 1000,
      timeout: 30000,
      readOnly: true,
    }),
  },

  // ============================================
  // REST API Templates
  // ============================================
  {
    name: 'REST API - Get Weather',
    description: 'GET request to retrieve current weather data from a weather API. Demonstrates API Key authentication.',
    category: 'rest',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'rest',
      method: 'GET',
      endpoint: 'https://api.weatherapi.com/v1/current.json',
      headers: JSON.stringify({
        'Content-Type': 'application/json',
      }),
      parameters: [
        {
          name: 'location',
          type: 'string',
          description: 'City name or coordinates (e.g., "London" or "48.8567,2.3508")',
          required: true,
        },
        {
          name: 'api_key',
          type: 'string',
          description: 'Weather API key',
          required: true,
        },
      ],
      queryParams: {
        q: '{{location}}',
        key: '{{api_key}}',
      },
      timeout: 10000,
    }),
  },

  {
    name: 'REST API - Create User',
    description: 'POST request to create a new user via REST API. Demonstrates JSON body parameters.',
    category: 'rest',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'rest',
      method: 'POST',
      endpoint: 'https://api.example.com/v1/users',
      headers: JSON.stringify({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{api_token}}',
      }),
      parameters: [
        {
          name: 'username',
          type: 'string',
          description: 'Username for the new user',
          required: true,
        },
        {
          name: 'email',
          type: 'string',
          description: 'Email address',
          required: true,
        },
        {
          name: 'full_name',
          type: 'string',
          description: 'Full name',
          required: false,
        },
        {
          name: 'api_token',
          type: 'string',
          description: 'API authentication token',
          required: true,
        },
      ],
      body: JSON.stringify({
        username: '{{username}}',
        email: '{{email}}',
        full_name: '{{full_name}}',
        active: true,
      }),
      timeout: 10000,
    }),
  },

  {
    name: 'REST API - Update Record',
    description: 'PUT/PATCH request to update an existing record via REST API.',
    category: 'rest',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'rest',
      method: 'PATCH',
      endpoint: 'https://api.example.com/v1/records/{{record_id}}',
      headers: JSON.stringify({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{api_token}}',
      }),
      parameters: [
        {
          name: 'record_id',
          type: 'string',
          description: 'ID of the record to update',
          required: true,
        },
        {
          name: 'status',
          type: 'string',
          description: 'New status value',
          required: true,
        },
        {
          name: 'notes',
          type: 'string',
          description: 'Update notes',
          required: false,
        },
        {
          name: 'api_token',
          type: 'string',
          description: 'API authentication token',
          required: true,
        },
      ],
      body: JSON.stringify({
        status: '{{status}}',
        notes: '{{notes}}',
        updated_at: new Date().toISOString(),
      }),
      timeout: 10000,
    }),
  },

  // ============================================
  // Webhook Template
  // ============================================
  {
    name: 'Webhook - Receive Form Submission',
    description: 'Webhook receiver to accept form submissions from external sources. Automatically generates a unique webhook URL.',
    category: 'webhook',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'webhook',
      path: '/webhook/form-submission',
      method: 'POST',
      description: 'Receives form submissions with validation',
      expectedFields: [
        {
          name: 'name',
          type: 'string',
          required: true,
        },
        {
          name: 'email',
          type: 'string',
          required: true,
        },
        {
          name: 'message',
          type: 'string',
          required: true,
        },
      ],
      responseTemplate: {
        success: true,
        message: 'Form submission received successfully',
      },
    }),
  },

  // ============================================
  // JavaScript Template
  // ============================================
  {
    name: 'JavaScript - Transform Data',
    description: 'JavaScript transformation function to process and format data. Useful for data manipulation and formatting.',
    category: 'javascript',
    isBuiltIn: true,
    config: JSON.stringify({
      type: 'javascript',
      code: `// Transform user data from API response
function transform(input) {
  // Input validation
  if (!input || !input.users) {
    return { error: 'Invalid input: missing users array' };
  }

  // Transform each user
  const transformed = input.users.map(user => ({
    id: user.id,
    fullName: \`\${user.first_name} \${user.last_name}\`,
    email: user.email.toLowerCase(),
    joinedDate: new Date(user.created_at).toLocaleDateString('en-US'),
    isActive: user.status === 'active',
    metadata: {
      accountAge: Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)),
      hasProfilePicture: !!user.avatar_url,
    }
  }));

  return {
    totalUsers: transformed.length,
    activeUsers: transformed.filter(u => u.isActive).length,
    users: transformed,
    generatedAt: new Date().toISOString(),
  };
}

// Return the result
return transform(params.input);`,
      parameters: [
        {
          name: 'input',
          type: 'object',
          description: 'Input data object with users array',
          required: true,
        },
      ],
      timeout: 5000,
      allowedFunctions: ['map', 'filter', 'reduce', 'Date', 'Math', 'JSON'],
    }),
  },
];

async function main() {
  console.log('🌱 Seeding database with built-in templates...');

  // Delete existing built-in templates (for idempotency)
  const deletedCount = await prisma.template.deleteMany({
    where: { isBuiltIn: true },
  });

  console.log(`   Removed ${deletedCount.count} existing built-in templates`);

  // Create new templates
  let createdCount = 0;
  for (const template of templates) {
    await prisma.template.create({
      data: template,
    });
    createdCount++;
    console.log(`   ✓ Created template: ${template.name}`);
  }

  console.log(`\n✅ Successfully seeded ${createdCount} built-in templates!`);
  console.log(`\nTemplate categories:`);
  console.log(`   - SQL: 5 templates`);
  console.log(`   - REST: 3 templates`);
  console.log(`   - Webhook: 1 template`);
  console.log(`   - JavaScript: 1 template`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
