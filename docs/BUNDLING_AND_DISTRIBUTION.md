# Deployment Guide

**Status**: ✅ **UPDATED** - Reflects Next.js-only architecture
**Last Updated**: 2025-10-15

---

## 🎯 Overview

Yasban is now a standard Next.js web application that runs locally on the user's machine. This document describes how to deploy and run the application.

---

## 🚀 Deployment Architecture

### **Development Mode**

```
User's Machine:
├── Next.js Dev Server (http://localhost:3001)
│   ├── Hot Module Replacement
│   ├── Fast Refresh
│   └── Source Maps
│
├── SQLite Database (prisma/dev.db)
│
└── MCP Runtime Processes (spawned as needed)
    └── Each server = separate Node.js process
```

### **Production Mode**

```
User's Machine:
├── Next.js Production Server (http://localhost:3001)
│   ├── Optimized Build (.next/)
│   ├── Static Assets
│   └── Server-Side Rendering
│
├── SQLite Database (prisma/dev.db)
│
└── MCP Runtime Processes (spawned as needed)
    └── Each server = separate Node.js process
```

---

## 📦 Build Process

### **1. Build All Packages**

```bash
# From workspace root
npm run build
```

This builds:
1. **Shared Package**: TypeScript utilities (`packages/shared/dist/`)
2. **MCP Runtime**: MCP server runtime (`packages/mcp-runtime/dist/`)
3. **Web App**: Next.js application (`packages/web/.next/`)

### **2. Build Output Structure**

```
yasban/
├── packages/
│   ├── shared/
│   │   └── dist/              # Built TypeScript utilities
│   ├── mcp-runtime/
│   │   └── dist/              # Built MCP runtime
│   │       └── index.js       # Main entry point
│   └── web/
│       ├── .next/             # Next.js production build
│       └── node_modules/      # Dependencies
│
└── prisma/
    └── dev.db                 # SQLite database
```

---

## 🏃 Running the Application

### **Development**

```bash
# From workspace root
npm run dev

# Or from packages/web/
cd packages/web
npm run dev
```

Opens browser at: **http://localhost:3001**

### **Production**

```bash
# Build first
npm run build

# Start production server
cd packages/web
npm run start
```

Opens browser at: **http://localhost:3001**

---

## 💾 Data Persistence

### **Database Location**

```
Development:   yasban/prisma/dev.db
Production:    yasban/prisma/dev.db (same location)
```

### **MCP Runtime Location**

```
Development:   yasban/packages/mcp-runtime/dist/
Production:    yasban/packages/mcp-runtime/dist/ (same location)
```

### **Logs Location**

```
Application:   packages/web/logs/
Server Logs:   packages/web/logs/servers/[server-id]/
```

---

## 🔧 Service Installation

### **Windows Service**

Install Yasban as a Windows Service using `node-windows`:

```javascript
// Implemented in packages/web/src/lib/service-manager.ts

const service = new Service({
  name: 'Yasban-Web',
  description: 'Yasban MCP Server Builder - Web Server',
  script: path.join(__dirname, '../../node_modules/next/dist/bin/next'),
  scriptOptions: 'start -p 3001',
  nodeOptions: [],
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'DATABASE_URL', value: 'file:../../../prisma/dev.db' }
  ]
});

service.install();
```

### **Linux Daemon**

Install Yasban as a Linux daemon using `node-linux`:

```javascript
// Similar to Windows service using node-linux package
```

---

## 📋 Deployment Checklist

### **Pre-Deployment**

- [ ] All tests pass: `npm test`
- [ ] Lint succeeds: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Database migrations applied: `npm run db:migrate`
- [ ] Environment variables configured

### **Deployment Steps**

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/yasban.git
   cd yasban
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Build application**
   ```bash
   npm run build
   ```

5. **Start production server**
   ```bash
   cd packages/web
   npm run start
   ```

6. **Access application**
   Open browser to: `http://localhost:3001`

---

## 🔒 Security Considerations

### **Production Deployment**

1. **Database Encryption**: All credentials are encrypted with AES-256-GCM
2. **Environment Variables**: Store sensitive configuration in `.env.local`
3. **HTTPS**: Consider using a reverse proxy (nginx, Apache) with SSL
4. **Firewall**: Only expose port 3001 to localhost by default
5. **Backups**: Regularly backup `prisma/dev.db`

### **Recommended .env.local**

```bash
# Database
DATABASE_URL="file:../../../prisma/dev.db"

# Node Environment
NODE_ENV="production"

# Logging
LOG_LEVEL="info"

# MCP Runtime
MCP_RUNTIME_PATH="../mcp-runtime/dist/index.js"
```

---

## 🔄 Updates and Maintenance

### **Application Updates**

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install new dependencies
npm install

# 3. Run database migrations
npm run db:migrate

# 4. Rebuild application
npm run build

# 5. Restart server
# (Stop current process and restart)
cd packages/web
npm run start
```

### **Runtime Updates**

```bash
# Rebuild MCP runtime only
npm run build:mcp

# Restart any running MCP server processes
# (Yasban will automatically use the new runtime)
```

---

## 🐛 Troubleshooting

### **Issue: Port 3001 already in use**

**Solution:**
```bash
# Find and kill process using port 3001
# Windows:
netstat -ano | findstr :3001
taskkill /F /PID <pid>

# Linux/macOS:
lsof -ti:3001 | xargs kill -9

# Or use a different port:
next start -p 3002
```

### **Issue: Database locked**

**Solution:**
```bash
# Stop all Yasban processes
# Delete .db-shm and .db-wal files
rm prisma/dev.db-shm prisma/dev.db-wal

# Restart application
```

### **Issue: MCP Runtime not found**

**Solution:**
```bash
# Rebuild MCP runtime
npm run build:mcp

# Verify it exists
ls packages/mcp-runtime/dist/index.js
```

---

## 📊 Performance Optimization

### **Production Best Practices**

1. **Use NODE_ENV=production**
   ```bash
   export NODE_ENV=production
   npm run start
   ```

2. **Enable Compression** (nginx example)
   ```nginx
   location / {
     proxy_pass http://localhost:3001;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     gzip on;
     gzip_types text/css application/javascript application/json;
   }
   ```

3. **Monitor Resource Usage**
   - Next.js server memory: ~100-200MB
   - Each MCP server: ~30-50MB
   - SQLite database: Grows with data

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [REFERENCE.md](./REFERENCE.md) - Technical reference

---

**Status**: ✅ **COMPLETE** - Next.js-only deployment
**Maintained By**: Yasban Core Team
**License**: MIT
