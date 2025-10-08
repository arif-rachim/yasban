# Yasban - Development Guide

Complete guide for developers working on Yasban.

**Last Updated**: 2025-10-08

---

## 🚀 Getting Started

### **Prerequisites**

- **Node.js**: 20+ (LTS recommended)
- **npm**: 10+ (comes with Node.js)
- **Git**: For version control
- **OS**: Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+)

### **Initial Setup**

```bash
# 1. Clone repository (when available)
git clone https://github.com/yourusername/yasban.git
cd yasban

# 2. Install dependencies
npm install

# 3. Initialize database
npm run db:migrate

# 4. Seed database with templates
npm run db:seed

# 5. Generate Prisma client
npm run db:generate

# 6. Start development server
npm run dev
```

**Expected outcome**: Electron app opens with empty dashboard.

---

## 📁 Project Structure

```
yasban/
├── electron/                    # Electron main process
│   ├── main.ts                 # Entry point
│   ├── preload.ts              # Context bridge
│   ├── ipc/                    # IPC handlers
│   ├── services/               # Service management
│   ├── database/               # Prisma client
│   └── crypto/                 # Encryption
│
├── src/                        # Next.js app (renderer)
│   ├── app/                    # Pages (App Router)
│   ├── components/             # React components
│   ├── lib/                    # Utilities
│   └── types/                  # TypeScript types
│
├── mcp-runtime/                # MCP server runtime
│   ├── src/
│   │   ├── server.ts
│   │   ├── hot-reload.ts
│   │   └── tools/              # Tool executors
│   └── package.json
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration files
│   └── seed.ts                 # Seed data
│
├── docs/                       # Documentation
│   ├── CLAUDE.md
│   ├── REFERENCE.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md (this file)
│   └── DECISIONS.md
│
├── public/                     # Static assets
├── build/                      # Build resources (icons)
├── next.config.js
├── electron-builder.yml
└── package.json
```

---

## 🛠️ Development Workflow

### **Daily Development**

```bash
# Start development (hot reload enabled)
npm run dev

# Run tests in watch mode
npm run test:watch

# View database in Prisma Studio
npm run db:studio
```

**Hot Reload Behavior:**
- **Next.js changes**: Instant hot reload in browser
- **Electron main process changes**: Requires manual restart (`Ctrl+R` in app)
- **Database schema changes**: Requires migration (`npm run db:migrate`)

### **Making Changes**

#### **1. Creating a New Feature**

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes...

# Run tests
npm test

# Commit
git add .
git commit -m "feat: add your feature description"

# Push
git push origin feature/your-feature-name
```

#### **2. Adding a New Page**

```bash
# Example: Add a "plugins" page
# Create: src/app/plugins/page.tsx

export default function PluginsPage() {
  return <div>Plugins</div>;
}

# Automatically routed to /plugins
```

#### **3. Adding a New Server Action**

```typescript
// src/app/your-feature/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function yourAction(formData: FormData) {
  const data = {
    name: formData.get('name') as string,
    // ... other fields
  };

  const result = await prisma.yourModel.create({ data });

  revalidatePath('/your-feature');
  return { success: true, data: result };
}

// Use in component:
import { yourAction } from './actions';

function YourComponent() {
  const [state, formAction] = useActionState(yourAction, null);

  return <form action={formAction}>...</form>;
}
```

#### **4. Adding a New Database Model**

```bash
# Edit prisma/schema.prisma
model YourModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}

# Create migration
npm run db:migrate

# Migration prompt: Enter name (e.g., "add_your_model")

# Generate Prisma client
npm run db:generate

# Update in code
import { prisma } from '../database/client';
await prisma.yourModel.create({ ... });
```

---

## 🧪 Testing

### **Unit Tests (Vitest)**

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

**Example test:**

```typescript
// src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '../utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-01-08');
    expect(formatDate(date)).toBe('2025-01-08');
  });
});
```

### **E2E Tests (Playwright)**

```bash
# Run E2E tests
npm run test:e2e

# Run with UI (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

**Example E2E test:**

```typescript
// e2e/create-sql-tool.spec.ts
import { test, expect } from '@playwright/test';

test('create SQL tool end-to-end', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Click "New Tool"
  await page.click('button:has-text("New Tool")');

  // Select SQL type
  await page.click('button:has-text("SQL Query")');

  // Fill wizard steps...
  await page.fill('input[name="host"]', 'localhost');
  await page.fill('input[name="port"]', '5432');

  // ... more steps

  // Save
  await page.click('button:has-text("Save Tool")');

  // Verify tool created
  await expect(page.locator('.tool-item')).toBeVisible();
});
```

### **Testing Best Practices**

1. **TDD for critical features**: Write tests before implementing (encryption, executors, hot-reload)
2. **Unit tests for utilities**: 80% coverage goal
3. **E2E for workflows**: Cover all critical user journeys
4. **Mock external services**: Don't hit real databases in unit tests

---

## 🗄️ Database Development

### **Creating Migrations**

```bash
# After editing schema.prisma:
npm run db:migrate

# Enter migration name (e.g., "add_templates_table")

# Migration file created in prisma/migrations/
```

### **Viewing Data**

```bash
# Open Prisma Studio (localhost:5555)
npm run db:studio

# Browse tables, edit data visually
```

### **Resetting Database**

```bash
# WARNING: Deletes all data
npm run db:reset

# Re-seed with templates
npm run db:seed
```

### **Seeding Data**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create 10 built-in templates
  await prisma.template.createMany({
    data: [
      {
        name: 'PostgreSQL Query Tool',
        description: 'Query PostgreSQL database',
        category: 'sql',
        config: JSON.stringify({ /* template config */ }),
        isBuiltIn: true
      },
      // ... more templates
    ]
  });

  console.log('Seed complete!');
}

main();
```

Run seed:
```bash
npm run db:seed
```

---

## 🐛 Debugging

### **Debugging Electron Main Process**

**VSCode launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "runtimeArgs": [".", "--remote-debugging-port=9222"],
      "sourceMaps": true
    }
  ]
}
```

**Browser DevTools:**

```bash
# Start dev server
npm run dev

# Open browser at http://localhost:3000
# Press F12 for DevTools
# All Server Actions visible in Network tab
# Console shows server-side logs
```

### **Debugging Server Actions**

```typescript
// Add logging in Server Actions
export async function createServer(formData: FormData) {
  console.log('[Server Action] createServer called with:', Object.fromEntries(formData));

  const result = await prisma.server.create({ data: ... });

  console.log('[Server Action] createServer result:', result);
  return { success: true, data: result };
}

// View logs in terminal where Next.js is running
// Or use Next.js DevTools in browser
```

### **Common Issues**

#### **Issue: Prisma Client not generated**

```bash
# Solution:
npm run db:generate
```

#### **Issue: Hot reload not working**

```bash
# Next.js changes should auto-reload
# If not, check terminal for errors
# Restart dev server if needed: npm run dev
```

#### **Issue: Database locked**

```bash
# Close Prisma Studio and app
# Restart dev server
npm run dev
```

---

## 📦 Building & Packaging

### **Build for Development**

```bash
# Build Next.js + Electron
npm run build

# Test built app (without packaging)
npm start
```

### **Package Installers**

```bash
# Build installer for current platform
npm run package

# Platform-specific:
npm run package:win      # Windows (.exe)
npm run package:mac      # macOS (.dmg)
npm run package:linux    # Linux (.AppImage + .deb)
```

**Output**: `dist/` folder contains installers.

### **Testing Installers**

1. **Windows**: Run `.exe`, install, verify app works
2. **macOS**: Open `.dmg`, drag to Applications, run
3. **Linux**: Run `.AppImage` or `sudo dpkg -i yasban.deb`

---

## 🎨 Code Style

### **ESLint**

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### **Prettier**

```bash
# Format all files
npm run format
```

### **Conventions**

- **File names**: `kebab-case.tsx` (e.g., `server-list.tsx`)
- **Component names**: `PascalCase` (e.g., `ServerList`)
- **Function names**: `camelCase` (e.g., `createServer`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_ROWS`)
- **Types/Interfaces**: `PascalCase` (e.g., `Server`, `ToolConfig`)

---

## 🔐 Security Development

### **Never Commit Secrets**

```bash
# Add to .gitignore:
.env
.env.local
*.db
*.db-journal
credentials.json
```

### **Encryption Best Practices**

1. Always encrypt credentials before storing in DB
2. Never log decrypted values
3. Use machine-specific encryption key
4. Validate auth tags on decryption

### **SQL Safety**

1. Always use parameterized queries
2. Never concatenate user input into SQL
3. Enforce max rows and timeouts
4. Warn on dangerous operations (DROP, DELETE)

---

## 🚢 Release Process

### **1. Version Bump**

```bash
# Update version in package.json
npm version minor  # or major/patch

# Commit
git commit -am "chore: bump version to X.Y.Z"
git push
```

### **2. Create Git Tag**

```bash
git tag v0.1.0
git push --tags
```

### **3. Build Installers**

```bash
# Build for all platforms
npm run package

# Upload to GitHub Releases
# Or configure auto-deploy via GitHub Actions
```

### **4. Publish Release**

1. Go to GitHub Releases
2. Create new release
3. Upload installers (`dist/*.exe`, `dist/*.dmg`, `dist/*.AppImage`)
4. Write changelog
5. Publish

---

## 🤝 Contributing Guidelines

### **Before Submitting PR**

1. ✅ Run tests: `npm test`
2. ✅ Run lint: `npm run lint`
3. ✅ Format code: `npm run format`
4. ✅ Build succeeds: `npm run build`
5. ✅ Update documentation if needed
6. ✅ Write clear commit messages

### **Commit Message Format**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Build/config

**Examples:**
```
feat(wizard): add REST API wizard

Implemented 5-step wizard for creating REST API tools with
authentication and response mapping.

Closes #42
```

---

## 📚 Learning Resources

### **Technologies**

- **Electron**: https://www.electronjs.org/docs
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **MCP SDK**: https://modelcontextprotocol.io/docs

### **Internal Docs**

- **[CLAUDE.md](./CLAUDE.md)** - Claude session instructions
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[DECISIONS.md](./DECISIONS.md)** - Why we made certain choices

---

## 🆘 Getting Help

### **Common Questions**

**Q: How do I add a new tool type?**
A: See `docs/ARCHITECTURE.md` - Tool Executors section

**Q: How does hot-reload work?**
A: See `docs/ARCHITECTURE.md` - Hot-Reload Pattern

**Q: Can I use PostgreSQL for Yasban's internal database?**
A: No, we use SQLite for desktop app simplicity. See `docs/DECISIONS.md`

### **Support Channels**

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and ideas
- **Documentation**: Check `docs/` folder first

---

## 🔗 Quick Links

- **[CLAUDE.md](./CLAUDE.md)** - Instructions for Claude sessions
- **[REFERENCE.md](./REFERENCE.md)** - Tech stack reference
- **[ROADMAP.md](./ROADMAP.md)** - Timeline
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design
- **[DECISIONS.md](./DECISIONS.md)** - Architecture decisions

---

**Maintained By**: Yasban Core Team
**License**: MIT
**Last Updated**: 2025-10-08
