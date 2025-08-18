# mcpresso

**Build MCP servers that work out of the box.**

mcpresso is a TypeScript framework that handles the complexity of building MCP (Model Context Protocol) servers so you can focus on your business logic.

Building a MCP server requires:
- Implementing the MCP protocol specification
- Building authentication systems (OAuth 2.1)
- Creating resource management layers
- Handling validation and error responses

## Solution

mcpresso gives you a working MCP server in minutes. Define your data models with Zod schemas, and mcpresso automatically handles everything else.

## Features

- **Authentication** - [OAuth 2.1](https://github.com/granular-software/joshu/tree/main/apps/template-docker-oauth-postgresql), bearer tokens, or none
- **Resources** - [Automatic CRUD operations](./examples/basic-crud.ts) with type-safe validation
- **Relationships** - [Define connections between resources](./docs/core-concepts.md#relationships)
- **Custom Methods** - [Extend beyond CRUD](./examples/custom-methods.ts) with business logic
- **Multi-tenancy** - [User data injection](./examples/multi-tenancy.ts) and scope-based access
- **Server Management** - [Rate limiting](./examples/rate-limiting.ts), [retry with backoff](./examples/retry-with-backoff.ts), [server metadata](./examples/server-metadata.ts)
- **MCP Compliance** - [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) with SSE support, [OAuth 2.1 authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization), [tools and resources](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

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

---

**mcpresso** - MCP servers that work out of the box, following the latest [Model Context Protocol specifications](https://modelcontextprotocol.io/specification/2025-06-18/basic).