# mcpresso · Make MCP servers actually usable

[![npm](https://img.shields.io/npm/v/mcpresso.svg)](https://www.npmjs.com/package/mcpresso)
[![CI Status](https://github.com/granular-software/mcpresso/workflows/CI/badge.svg)](https://github.com/granular-software/mcpresso/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**The toolkit that turns broken MCP servers into production-grade tools.**

![Demo](https://github.com/valentinsimplifier/documentation/blob/main/gif.gif)

## Quick Start

```bash
npx mcpresso init
cd my-server
npm run dev
```

Your MCP server is live at `http://localhost:3000` in under 2 minutes.

## Why mcpresso?

- **Authentication** - [OAuth 2.1](https://github.com/granular-software/template-docker-oauth-postgresql), bearer tokens, or none
- **Resources** - [Automatic CRUD operations](./examples/basic-crud.ts) with type-safe validation
- **Relationships** - [Define connections between resources](./docs/core-concepts.md#relationships)
- **Custom Methods** - [Extend beyond CRUD](./examples/custom-methods.ts) with business logic
- **Multi-tenancy** - [User data injection](./examples/multi-tenancy.ts) and scope-based access
- **Server Management** - [Rate limiting](./examples/rate-limiting.ts), [retry with backoff](./examples/retry-with-backoff.ts), [server metadata](./examples/server-metadata.ts)

We built 5 MCP servers before mcpresso. Every time, the same problems: boilerplate, broken auth, runtime failures. mcpresso fixes all of it.

## Examples

- **[Hello World](./examples/hello-world.ts)** – minimal server
- **[Basic CRUD](./examples/basic-crud.ts)** – resource management
- **[Custom Methods](./examples/custom-methods.ts)** – beyond CRUD
- **[Multi-tenancy](./examples/multi-tenancy.ts)** – user isolation

## From pain to production

We wired **Claude AI** to a personal Airtable CMS. The naive server spammed `list()` and blew token limits. With mcpresso:

- Removed dumb `list()` calls
- Added enriched endpoints
- Collapsed 10+ calls into 1

**Result:** rebuilt in a weekend, stable in prod by Tuesday.  
[Read the story →](https://medium.com/p/08730db7ab8c)

## Documentation

- **[Getting Started](./docs/getting-started.md)** - Complete beginner guide
- **[Core Concepts](./docs/core-concepts.md)** - Resources, schemas, authentication
- **[Examples](./examples/)** - Working code examples
- **[CLI Reference](./docs/cli-reference.md)** - Command-line tools

## MCP Standards Compliance

mcpresso follows the latest [Model Context Protocol specifications](https://modelcontextprotocol.io/specification/2025-06-18/basic) including:
- **Streamable HTTP Transport** - [Latest transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) with SSE support for real-time communication
- **OAuth 2.1 Authorization** - [Latest authorization standard](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) as specified in MCP 2025-06-18
- **Tools and Resources** - [Proper MCP tool definition](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) and resource management
- **Protocol Compliance** - Full adherence to MCP lifecycle, message format, and error handling requirements

## Templates

| Template | Use Case | Auth | Database |
|----------|----------|------|----------|
| **Express + No Auth** | Public APIs, development | None | In-memory |
| **Express + OAuth + SQLite** | Small applications | OAuth 2.1 | SQLite |
| **Docker + OAuth + PostgreSQL** | Production deployments | OAuth 2.1 | PostgreSQL |
| **Docker + Single User** | Internal tools | API Key | None |

## Contributing

We welcome contributions!  
- [Discussions](https://github.com/granular-software/mcpresso/discussions)  
- [Contribution guide](CONTRIBUTING.md)

## License

MIT © Granular Software