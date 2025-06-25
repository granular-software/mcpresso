# mcpresso

**mcpresso** is a lightweight, powerful TypeScript library for rapidly building [Model Context Protocol (MCP)](https://example.com) servers. It simplifies the process of exposing your data models and business logic as fully compliant MCP resources and tools, enabling seamless integration with AI agents and language models.

With a strong focus on developer experience, type safety, and flexibility, `mcpresso` allows you to:

* ✅ **Define Resources with Zod**: Use [Zod](https://zod.dev/) schemas to define your data models—`mcpresso` handles validation and type inference.
* ⚙️ **Auto-Generate CRUD Tools**: Automatically expose standard tools (`create`, `update`, `delete`, `list`) from your resource handlers.
* 📘 **Expose JSON Type Schemas**: Generate machine-readable schemas to help models understand your data structure.
* 🔗 **Model Relationships**: Easily define and link related resources using standardized schema references.
* 🔐 **Add Authentication Fast**: Secure your server with OAuth 2.1 in just a few lines.
* 🧠 **Extend with Custom Logic**: Create custom tools and advanced methods tailored to your application's domain.

An unopinionated, "bring your own" server toolkit for the Model-Context Protocol (MCP).

**Note: This package is experimental and subject to breaking changes.**

Built on [Hono](https://hono.dev/), `mcpresso` offers a familiar foundation while abstracting away MCP protocol complexity—so you can focus on your application's logic.

---

## 📦 Installation

Install `mcpresso` via your preferred package manager:

```bash
npm install mcpresso
```

```bash
yarn add mcpresso
```

```bash
pnpm add mcpresso
```

---

## 🚀 Quick Start

Spin up a compliant MCP server in just a few lines:

```ts
import { z } from "zod";
import { createResource, createMCPServer } from "mcpresso";

// Define a schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const users = [{ id: "1", name: "Alice" }];

// Create a resource
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  handlers: {
    get: async ({ id }) => users.find((u) => u.id === id),
    list: async () => users,
  },
});

// Launch the server
const server = createMCPServer({
  name: "my_simple_server",
  resources: [userResource],
});

server.listen(3080, () => {
  console.log("MCPresso server running on http://localhost:3080");
});
```

## 🛠️ OpenAPI Generator

For generating MCPresso servers from OpenAPI specifications, we now have a dedicated package: **[mcpresso-openapi-generator](https://github.com/granular-software/mcpresso-openapi-generator)**.

This standalone package provides a powerful CLI tool that can generate complete MCPresso servers directly from any OpenAPI 3.x specification with full type safety and MCP compliance.

### Installation

```bash
npm install -g mcpresso-openapi-generator
```

### Quick Usage

```bash
# Generate a server from OpenAPI spec
mcpresso-generate generate \
  --source ./api-spec.json \
  --output ./my-server \
  --name my-api-server \
  --verbose

# Initialize a new MCPresso project
mcpresso-generate init \
  --name my-project \
  --output ./projects \
  --verbose
```

### Features

- 🚀 **Automatic Generation**: Convert any OpenAPI 3.0 specification to a MCPresso server
- 🔒 **Type Safety**: Full TypeScript support with Zod schema validation
- 🎯 **MCP Compliance**: Generated servers follow MCP (Model Context Protocol) standards
- 📦 **Ready to Run**: Complete project structure with dependencies and scripts
- 🔧 **Customizable**: Configurable API client with authentication and error handling

Visit the [mcpresso-openapi-generator repository](https://github.com/granular-software/mcpresso-openapi-generator) for full documentation and examples.

## 🚀 Deployment

For instructions on how to deploy your `mcpresso` server to various platforms like Cloudflare Workers, Vercel, and AWS Lambda, see our [Deployment Guide](./deploy.md).

---

## 🧹 Core Concepts

### Resources

A **Resource** is the core unit in `mcpresso`, representing a type of data exposed to AI agents. It combines:

* A **Schema**: Defines structure and validation rules.
* **Handlers**: Implement logic like reading or updating data.
* **Configuration**: Metadata like name and URI format.

### Schemas

Define your data models using [Zod](https://zod.dev/), a TypeScript-first schema library that provides:

* Type inference
* Runtime validation
* Clean developer ergonomics

### Handlers

Handlers implement business logic and are automatically converted into MCP tools callable by AI agents or clients.

---

## 🛠️ Defining Resources

### Standard CRUD

`mcpresso` automatically generates standard `create`, `read`, `update`, `delete`, and `list` tools based on your handlers:

```ts
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  handlers: {
    get: async ({ id }) => db.notes.findUnique({ where: { id } }),
    list: async () => db.notes.findMany(),
    create: async (data) => db.notes.create({ data }),
    update: async ({ id, ...data }) => db.notes.update({ where: { id }, data }),
    delete: async ({ id }) => db.notes.delete({ where: { id } }),
  },
});
```

### Granular Field Control with `.readonly()`

To distinguish between editable and readonly properties in your schemas, use Zod's `.readonly()` method. Properties marked as `.readonly()` are automatically excluded from create and update operations, but are included in GET and LIST responses.

**Example:**

```ts
const UserSchema = z.object({
  id: z.string().readonly(),           // Readonly: auto-generated by server
  name: z.string(),                    // Editable
  email: z.string().email(),           // Editable
  createdAt: z.date().readonly(),      // Readonly: set by server
  updatedAt: z.date().readonly(),      // Readonly: set by server
});
```

- **GET/LIST:** All properties (including readonly) are returned.
- **CREATE:** Only editable properties are accepted (readonly fields are ignored).
- **UPDATE:** Only editable properties are accepted (readonly fields are ignored).



---

## 🔗 Handling Relationships

Define relationships between resources and let `mcpresso` auto-link them via `$ref` in the schema:

```ts
relations: {
  authorId: { type: 'user' },  // one-to-one
  tagIds: { type: 'tag' },     // one-to-many
}
```

This enriches the generated schema, helping agents infer structure like:

```json
"authorId": { "$ref": "type://my_server/user" }
```

---

## 🔍 Search & Custom Tools

In addition to basic CRUD, `mcpresso` supports advanced query capabilities and custom business logic via two extensions:

### Custom Search Tools

Add a `search` handler with a defined input schema:

```ts
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  methods: {
    search: {
      description: "Search notes by content and author",
      inputSchema: z.object({
        query: z.string().describe("Search text in content."),
        authorId: z.string().optional().describe("Filter by author."),
      }),
      handler: async ({ query, authorId }) => {
        return db.notes.findMany({
          where: { content: { contains: query }, authorId },
        });
      },
    },
  },
});
```

### Custom Method Tools

Use the `methods` block inside a resource to define domain-specific tools that go beyond standard operations:

```ts
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  methods: {
    count_by_author: {
      description: "Counts how many notes a specific author has written.",
      inputSchema: z.object({
        authorId: z.string(),
      }),
      handler: async ({ authorId }) => {
        const count = await db.notes.count({ where: { authorId } });
        return { count };
      },
    },
  },
});
```

This registers a custom MCP tool named `count_by_author_note` that AI agents can invoke.

---

## 🧠 Type Exposure

Enable models and tools to understand your data by exposing types via:

```ts
exposeTypes: true
```

Each type is exposed at:

```
type://<server_name>/<resource_name>
```

This includes:

* Fully resolved JSON Schema (with `$ref` links)
* Available tools
* URI templates

---

## 🔐 Authentication

Secure your MCP server using OAuth 2.1 with minimal config:

```ts
auth: {
  issuer: 'https://your-auth-server.com',
}
```

`mcpresso` will:

* Advertise security metadata at `/.well-known/oauth-protected-resource-metadata`
* Validate Bearer JWTs automatically

---

## 🔁 Automatic Retries

`mcpresso` can automatically retry failed handler executions with exponential back-off. This is useful for making your server more resilient to transient errors.

To enable it, add a `retry` configuration to your server:

```ts
const server = createMCPServer({
  name: "my_simple_server",
  resources: [userResource],
  retry: {
    retries: 5, // Number of retries
    factor: 2, // Exponential factor
    minTimeout: 1000, // Initial timeout in ms
    maxTimeout: 60000, // Maximum timeout in ms
  },
});
```

All configuration options are optional.

A standalone example demonstrating this feature with a randomly failing handler is available at [`packages/mcpresso/examples/retry.ts`](./examples/retry.ts).

---

## ⏱️ Rate Limiting

Protect your server from abuse by applying rate limiting. `mcpresso` uses the popular [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) package under the hood.

Enable it by adding a `rateLimit` configuration to your server:

```ts
const server = createMCPServer({
  name: "my_simple_server",
  resources: [userResource],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
  },
});
```

A standalone example demonstrating this feature is available at [`packages/mcpresso/examples/rate-limit.ts`](./examples/rate-limit.ts).

---

## 📊 Server Metadata

Expose comprehensive server information as an MCP resource to help clients understand your server's capabilities and configuration.

Enable it by adding a `serverMetadata` configuration to your server:

```ts
const server = createMCPServer({
  name: "my_simple_server",
  resources: [userResource],
  serverMetadata: {
    name: "My API Server",
    version: "1.0.0",
    description: "A comprehensive API server with user management",
    url: "https://api.example.com",
    contact: {
      name: "API Support Team",
      email: "support@example.com",
      url: "https://example.com/support",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    capabilities: {
      authentication: true,
      rateLimiting: true,
      retries: true,
      streaming: true,
    },
  },
});
```

The metadata is automatically exposed as a read-only resource at:

```
metadata://<server_name>/server
```

A standalone example demonstrating this feature is available at [`packages/mcpresso/examples/server-metadata.ts`](./examples/server-metadata.ts).

---

## 📁 Full Example

A complete example showing most features is available at:

```
packages/mcpresso/examples/mcpresso.ts
```

## Documentation

- [MCPresso Generator Guide](./docs/generator.md)

## 🛠️ OpenAPI Generator

For generating MCPresso servers from OpenAPI specifications, we now have a dedicated package: **[mcpresso-openapi-generator](https://github.com/granular-software/mcpresso-openapi-generator)**.

This standalone package provides a powerful CLI tool that can generate complete MCPresso servers directly from any OpenAPI 3.x specification with full type safety and MCP compliance.

### Installation

```bash
npm install -g mcpresso-openapi-generator
```

### Quick Usage

```bash
# Generate a server from OpenAPI spec
mcpresso-generate generate \
  --source ./api-spec.json \
  --output ./my-server \
  --name my-api-server \
  --verbose

# Initialize a new MCPresso project
mcpresso-generate init \
  --name my-project \
  --output ./projects \
  --verbose
```

### Features

- 🚀 **Automatic Generation**: Convert any OpenAPI 3.0 specification to a MCPresso server
- 🔒 **Type Safety**: Full TypeScript support with Zod schema validation
- 🎯 **MCP Compliance**: Generated servers follow MCP (Model Context Protocol) standards
- 📦 **Ready to Run**: Complete project structure with dependencies and scripts
- 🔧 **Customizable**: Configurable API client with authentication and error handling

Visit the [mcpresso-openapi-generator repository](https://github.com/granular-software/mcpresso-openapi-generator) for full documentation and examples.
