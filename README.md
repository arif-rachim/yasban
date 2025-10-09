# Yasban (يسبان)

**Easy Builder for AI Tools**

> Build MCP (Model Context Protocol) servers visually, without code. Connect databases and APIs to AI assistants like Claude Desktop in minutes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

---

## 🎯 What is Yasban?

Yasban is a **free, open-source, desktop application** that makes it easy for anyone to create MCP servers through a visual, wizard-driven interface. No coding required.

### **What can you do with Yasban?**

- ✅ **Query databases visually** - Connect PostgreSQL, MySQL, SQL Server, or SQLite
- ✅ **Call REST APIs** - Integrate with any HTTP API
- ✅ **Create webhooks** - Receive and process webhook events
- ✅ **Test before deploying** - Built-in test panel with mock mode
- ✅ **Version control** - Rollback to any previous configuration
- ✅ **Install as service** - Run as Windows Service or Linux daemon
- ✅ **Export projects** - Generate standalone Node.js projects

### **Who is it for?**

- 🎯 **Business Analysts** - Query databases without SQL knowledge
- 🎯 **Data Analysts** - Create data tools for AI assistants
- 🎯 **Developers** - Rapid MCP server prototyping
- 🎯 **IT Admins** - Manage enterprise integrations

---

## 🚀 Quick Start

### **Installation**

#### **Windows**

```bash
# Download latest release
# Run Yasban-Setup-0.1.0.exe
# Follow installer prompts
```

#### **macOS**

```bash
# Download latest release
# Open Yasban-0.1.0.dmg
# Drag Yasban to Applications folder
```

#### **Linux**

```bash
# AppImage (no installation)
chmod +x Yasban-0.1.0.AppImage
./Yasban-0.1.0.AppImage

# Or install .deb
sudo dpkg -i yasban_0.1.0_amd64.deb
```

### **First Steps**

1. **Launch Yasban**
2. **Click "New Tool"** → Select "SQL Query Tool"
3. **Connect to your database** (or use SQLite demo)
4. **Write a SQL query** (e.g., `SELECT * FROM users WHERE status = $status`)
5. **Define parameters** (auto-detected from query)
6. **Test your tool** in the built-in test panel
7. **Save** - Your first MCP tool is ready!

---

## ✨ Features

### **🎨 Visual Tool Builder**

- Step-by-step wizards for SQL, REST, and Webhook tools
- Monaco editor with syntax highlighting
- Auto-parameter detection
- Form-based or connection string input

### **🔐 Enterprise-Ready Security**

- AES-256-GCM encryption for all credentials
- Parameterized SQL queries (prevent injection)
- SQL safety limits (max rows, timeout, dangerous query warnings)
- Read-only mode for database connections

### **🕰️ Version Control**

- Auto-snapshot on every change
- Version history with diff viewer
- One-click rollback
- Audit trail (who changed what and when)

### **⚡ Hot-Reload**

- Config changes apply instantly
- Zero downtime reloads
- No service restart needed

### **🧪 Built-in Testing**

- Test tools without leaving the app
- Mock mode (test without hitting real systems)
- Save test cases for reuse
- View results in table or JSON format

### **🖥️ Service Management**

- Install as Windows Service or Linux daemon
- Auto-start on boot
- Health monitoring and auto-restart
- View logs in real-time

### **📤 Export & Integration**

- Export as `mcp.json` (standard MCP config)
- Export as standalone Node.js/TypeScript project
- One-click "Test in Claude Desktop" integration
- Import/export servers for sharing

---

## 📸 Screenshots

<!-- TODO: Add screenshots after UI is built -->

**Dashboard**
```
Coming soon...
```

**SQL Tool Wizard**
```
Coming soon...
```

**Test Panel**
```
Coming soon...
```

**Version History**
```
Coming soon...
```

---

## 🏗️ Architecture

Yasban consists of three main components:

1. **Electron App** - Desktop UI built with Next.js 15
2. **MCP Runtime** - MCP server execution engine
3. **SQLite Database** - Local configuration storage

```
┌─────────────────────────────────┐
│      Yasban Desktop App         │
│  (Electron + Next.js + Jotai)   │
└────────────┬────────────────────┘
             │
             │ IPC
             ▼
┌─────────────────────────────────┐
│     SQLite Database (Prisma)    │
│  • Servers  • Tools             │
│  • Connections  • Versions      │
└────────────┬────────────────────┘
             │
             │ Spawns/Manages
             ▼
┌─────────────────────────────────┐
│        MCP Runtime              │
│  • SQL Executor                 │
│  • REST Executor                │
│  • Webhook Executor             │
│  • Hot-Reload Watcher           │
└────────────┬────────────────────┘
             │
             │ MCP Protocol
             ▼
┌─────────────────────────────────┐
│       Claude Desktop            │
│      (AI Assistant)             │
└─────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for details.

---

## 🛠️ Tech Stack

- **Desktop**: Electron 33+ + Next.js 15 (Nextron)
- **UI**: React 18 + Tailwind CSS + Radix UI
- **State**: Jotai
- **Database**: SQLite + Prisma
- **Editor**: Monaco Editor
- **MCP**: @modelcontextprotocol/sdk
- **Service**: node-windows + node-linux
- **Testing**: Vitest + Playwright

See [docs/REFERENCE.md](./docs/REFERENCE.md) for complete tech stack.

---

## 📚 Documentation

### **Developer Documentation**

- 📄 🔥 [**CURRENT_SESSION_STATUS.md**](./docs/CURRENT_SESSION_STATUS.md) - **Current progress & next priorities**
- 📄 [**CLAUDE.md**](./docs/CLAUDE.md) - Instructions for Claude Code sessions
- 📄 [**REFERENCE.md**](./docs/REFERENCE.md) - Quick technical reference
- 📄 [**ROADMAP.md**](./docs/ROADMAP.md) - Timeline and feature roadmap
- 📄 [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - System architecture
- 📄 [**DEVELOPMENT.md**](./docs/DEVELOPMENT.md) - Development workflow
- 📄 [**DECISIONS.md**](./docs/DECISIONS.md) - Architecture Decision Records

### **User Documentation**

- 📖 **Getting Started** - *(coming soon)*
- 📖 **SQL Tool Tutorial** - *(coming soon)*
- 📖 **REST API Tutorial** - *(coming soon)*
- 📖 **Service Installation Guide** - *(coming soon)*
- 📖 **Version Control Guide** - *(coming soon)*

---

## 🗺️ Roadmap

### **Phase 1: MVP (Months 1-4)** ← Current Phase

**Core Features:**
- [x] SQL tool wizard (PostgreSQL, MySQL, SQL Server, SQLite)
- [x] REST API tool wizard
- [x] Webhook tool wizard
- [x] Connection management with encryption
- [x] Service installation (Windows + Linux)
- [x] Version control with rollback
- [x] Hot-reload on config changes
- [x] Built-in test panel
- [x] 10 built-in templates
- [x] Export as Node.js project + mcp.json
- [x] All 3 MCP transports (stdio, SSE, HTTP)

### **Phase 2: Advanced Features (Months 5-7)**

- [ ] Resources and Prompts (MCP primitives)
- [ ] Full JavaScript custom tools (with isolated-vm sandboxing)
- [ ] Python export
- [ ] OAuth 2.0 authentication
- [ ] GraphQL and gRPC support
- [ ] Template marketplace
- [ ] Cloud storage integration

### **Phase 3: Enterprise (Months 8-10)**

- [ ] Team collaboration
- [ ] Visual query builder
- [ ] Analytics dashboard
- [ ] Plugin system
- [ ] Cloud deployment option

See [docs/ROADMAP.md](./docs/ROADMAP.md) for detailed timeline.

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **Ways to Contribute**

- 🐛 **Report bugs** - Open an issue
- 💡 **Suggest features** - Start a discussion
- 📖 **Improve docs** - Submit a PR
- 🧑‍💻 **Write code** - Pick an issue and submit a PR
- 🎨 **Design** - UI/UX improvements
- 🧪 **Test** - Test on different platforms

### **Development Setup**

```bash
# Clone repository
git clone https://github.com/yourusername/yasban.git
cd yasban

# Install dependencies
npm install

# Setup database
npm run db:migrate
npm run db:seed

# Start development
npm run dev
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for complete setup guide.

### **Before Submitting PR**

- ✅ Run tests: `npm test`
- ✅ Run lint: `npm run lint`
- ✅ Format code: `npm run format`
- ✅ Build succeeds: `npm run build`

---

## 📜 License

Yasban is released under the [MIT License](./LICENSE).

**You are free to:**
- ✅ Use commercially
- ✅ Modify
- ✅ Distribute
- ✅ Sublicense

**With the requirement to:**
- ⚠️ Include copyright notice
- ⚠️ Include license text

---

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) - Desktop app framework
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [MCP SDK](https://modelcontextprotocol.io/) - Model Context Protocol
- [Jotai](https://jotai.org/) - State management
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

Special thanks to:
- Anthropic for creating the Model Context Protocol
- The open-source community

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/yasban/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/yasban/discussions)
- 📖 **Documentation**: [docs/](./docs/)

---

## 🌟 Star History

If you find Yasban useful, please consider giving it a star on GitHub!

<!-- TODO: Add star history chart after launch -->

---

**Made with ❤️ by the Yasban Team**

**يسبان - Easy Builder for AI Tools**
