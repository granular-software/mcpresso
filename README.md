# MCPresso
## The only MCP toolkit with **production authentication**

> OAuth 2.1 • PostgreSQL auth database • MCP 2025-06-18 compliant

[![npm](https://img.shields.io/npm/v/mcpresso.svg)](https://www.npmjs.com/package/mcpresso)
[![CI Status](https://github.com/granular-software/mcpresso/workflows/CI/badge.svg)](https://github.com/granular-software/mcpresso/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## The Problem

Every MCP tutorial stops at localhost. **Production needs authentication.**

❌ No multi-user authentication in MCP tutorials  
❌ OAuth 2.1 implementation complexity  
❌ No production-ready auth examples  

**MCPresso CLI: OAuth 2.1 compliant MCP servers with dedicated auth database.**

---

## 🚀 Choose Your Template

### **Single User Authentication**
```bash
npx mcpresso init --template template-docker-single-user --name my-api --yes
cd my-api
npm install
npm run dev
```
*→ OAuth 2.1 compliant authentication for single user scenarios*

### **Multi-user with SQLite**
```bash
npx mcpresso init --template template-express-oauth-sqlite --name my-api --yes
cd my-api
npm install
npm run db:init  # Initialize SQLite authentication database
npm run user:create "John Doe" "john@example.com" "password123"
npm run secret:generate
npm run dev
```
*→ OAuth 2.1 authentication + SQLite auth database for few users*

### **Multi-user with PostgreSQL**
```bash
npx mcpresso init --template template-docker-oauth-postgresql --name my-api --yes
cd my-api
npm install
npm run db:init  # Initialize PostgreSQL authentication database
npm run user:create "John Doe" "john@example.com" "password123"
npm run secret:generate  # Generate JWT secret for OAuth 2.1
npm run dev
```
*→ OAuth 2.1 authentication + PostgreSQL authentication database for more users*

---

## Beyond Authentication

**👤 User context** - Every handler gets authenticated user automatically  
**⚡ Auto CRUD** - [Zod schemas → REST endpoints](https://github.com/granular-software/mcpresso/tree/main/examples/basic-crud.ts)  
**🔗 Relationships** - [Define connections between resources](https://github.com/granular-software/mcpresso/tree/main/docs/core-concepts.md#relationships)  
**⚙️ Custom Methods** - [Extend beyond CRUD with business logic](https://github.com/granular-software/mcpresso/tree/main/examples/custom-methods.ts)  
**👥 Multi-tenancy** - [User data injection and scope-based access](https://github.com/granular-software/mcpresso/tree/main/examples/multi-tenancy.ts)  
**🛡️ Production ready** - [Rate limiting](https://github.com/granular-software/mcpresso/tree/main/examples/rate-limiting.ts), [retries](https://github.com/granular-software/mcpresso/tree/main/examples/retry-with-backoff.ts), [server metadata](https://github.com/granular-software/mcpresso/tree/main/examples/server-metadata.ts)

---

## MCP Standards Compliance

MCPresso follows [Model Context Protocol 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic) specifications:

**🔐 OAuth 2.1 Authorization** - [MCP authorization standard](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) with PKCE support  
**🌐 Streamable HTTP Transport** - [Transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) with SSE  
**🛠️ Tools and Resources** - [Proper MCP tool definition](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) and resource management  
**📋 Protocol Compliance** - Full MCP lifecycle, message format, and error handling requirements

---

## Examples

**[Hello World](https://github.com/granular-software/mcpresso/tree/main/examples/hello-world.ts)** – Minimal server  
**[Basic CRUD](https://github.com/granular-software/mcpresso/tree/main/examples/basic-crud.ts)** – Resource management  
**[Custom Methods](https://github.com/granular-software/mcpresso/tree/main/examples/custom-methods.ts)** – Beyond CRUD  
**[Multi-tenancy](https://github.com/granular-software/mcpresso/tree/main/examples/multi-tenancy.ts)** – User isolation

---

**⭐ Star us if MCPresso solves your MCP authentication headaches.**

---

*MIT License. Experimental - pin version for production.*