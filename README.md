# mcpresso

[![npm](https://img.shields.io/npm/v/mcpresso.svg)](https://www.npmjs.com/package/mcpresso)
[![CI Status](https://github.com/granular-software/mcpresso/workflows/CI/badge.svg)](https://github.com/granular-software/mcpresso/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Project Status](https://img.shields.io/badge/status-active-brightgreen.svg)](https://github.com/granular-software/mcpresso)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Build MCP servers that work out of the box.**

mcpresso is a TypeScript framework that handles the complexity of building MCP (Model Context Protocol) servers so you can focus on your business logic.

**Supported Node.js version:** 18.0.0 or higher

Building an MCP server requires:
- Implementing the MCP protocol specification
- Building authentication systems (OAuth 2.1)
- Creating resource management layers
- Handling validation and error responses

## Solution

mcpresso gives you a working MCP server in minutes. Define your data models with Zod schemas, and mcpresso automatically handles everything else.

## Features

- **Authentication** - [OAuth 2.1](https://github.com/granular-software/template-docker-oauth-postgresql), bearer tokens, or none
- **Resources** - [Automatic CRUD operations](./examples/basic-crud.ts) with type-safe validation
- **Relationships** - [Define connections between resources](./docs/core-concepts.md#relationships)
- **Custom Methods** - [Extend beyond CRUD](./examples/custom-methods.ts) with business logic
- **Multi-tenancy** - [User data injection](./examples/multi-tenancy.ts) and scope-based access
- **Server Management** - [Rate limiting](./examples/rate-limiting.ts), [retry with backoff](./examples/retry-with-backoff.ts), [server metadata](./examples/server-metadata.ts)

## MCP Standards Compliance

mcpresso follows the latest [Model Context Protocol specifications](https://modelcontextprotocol.io/specification/2025-06-18/basic) including:
- **Streamable HTTP Transport** - [Latest transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) with SSE support for real-time communication
- **OAuth 2.1 Authorization** - [Latest authorization standard](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) as specified in MCP 2025-06-18
- **Tools and Resources** - [Proper MCP tool definition](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) and resource management
- **Protocol Compliance** - Full adherence to MCP lifecycle, message format, and error handling requirements

## Quick Start

```bash
# Create and start a server in 2 minutes
npx mcpresso init
cd my-server
npm run dev
```

Your MCP server is now running at `http://localhost:3000`.

## Templates

| Template | Use Case | Auth | Database |
|----------|----------|------|----------|
| **Express + No Auth** | Public APIs, development | None | In-memory |
| **Express + OAuth + SQLite** | Small applications | OAuth 2.1 | SQLite |
| **Docker + OAuth + PostgreSQL** | Production deployments | OAuth 2.1 | PostgreSQL |
| **Docker + Single User** | Internal tools | API Key | None |

## Documentation

- **[Getting Started](./docs/getting-started.md)** - Complete beginner guide
- **[Core Concepts](./docs/core-concepts.md)** - Resources, schemas, authentication
- **[Examples](./examples/)** - Working code examples
- **[CLI Reference](./docs/cli-reference.md)** - Command-line tools

## Examples

- **[Hello World](./examples/hello-world.ts)** - Minimal server
- **[Basic CRUD](./examples/basic-crud.ts)** - Resource management
- **[Custom Methods](./examples/custom-methods.ts)** - Business logic beyond CRUD
- **[Multi-tenancy](./examples/multi-tenancy.ts)** - User isolation and access control


## Contributing

We welcome contributions to mcpresso! New features are planned and actively being developed. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

Please ensure your code follows our existing style and includes appropriate tests.

---

**mcpresso** - MCP servers that work out of the box, following the latest [Model Context Protocol specifications](https://modelcontextprotocol.io/specification/2025-06-18/basic).