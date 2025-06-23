# mcpresso

**mcpresso** is a lightweight and powerful TypeScript library for rapidly building Model Context Protocol (MCP) servers. It simplifies the process of exposing your data models and business logic as fully compliant MCP resources and tools, enabling seamless integration with AI agents and language models.

With a focus on developer experience, type safety, and flexibility, `mcpresso` allows you to:

*   **Define Resources with Zod:** Use Zod schemas to define your data models, and `mcpresso` will handle data validation and type inference automatically.
*   **Generate CRUD Tools:** Automatically generate standard tools (`create`, `update`, `delete`, `list`) from your resource handlers.
*   **Expose Type Schemas:** Automatically generate and expose JSON schemas for your data types, enabling models to understand your data structure.
*   **Handle Relationships:** Easily define and expose relationships between your resources, with automatic schema linking.
*   **Secure Your Server:** Add OAuth 2.1 authentication with just a few lines of configuration.
*   **Extend with Custom Logic:** Go beyond basic CRUD by adding custom search methods or any other specialized tools your agents might need.

Powered by Express.js, `mcpresso` provides a familiar foundation while abstracting away the complexities of the Model Context Protocol, letting you focus on what matters: your application's logic.

## Installation

Install `mcpresso` using your favorite package manager:

```bash
npm install mcpresso
```

```bash
yarn add mcpresso
```

```bash
pnpm add mcpresso
```

## Quick Start

Create a fully compliant MCP server in just a few lines of code. Define a schema, create a resource, and launch the server.

```typescript
import { z } from "zod";
import { createResource, createMCPServer } from "@joshu/mcpresso";

// 1. Define a schema for your data
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// In-memory data store for the example
const users = [{ id: "1", name: "Alice" }];

// 2. Create a resource with handlers
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  handlers: {
    get: async ({ id }) => users.find((user) => user.id === id),
    list: async () => users,
  },
});

// 3. Create and launch the MCP server
const server = createMCPServer({
  name: "my_simple_server",
  resources: [userResource],
});

server.listen(3080, () => {
  console.log("MCPresso server running on http://localhost:3080");
});
```

## Core Concepts

### Resources
A Resource is the fundamental building block in `mcpresso`. It represents a type of data you want to expose to an AI agent. Each resource bundles together three key things:
- A **Schema**: The structure and validation rules for your data.
- **Handlers**: The functions that implement the business logic (e.g., creating, reading, or updating data).
- **Configuration**: Metadata like the resource's name and how to format its unique URI.

### Schemas
`mcpresso` uses [Zod](https://zod.dev/) for schema definition. This provides powerful compile-time type safety and runtime data validation out of the box. You simply define a Zod object, and `mcpresso` handles the rest.

### Handlers
Handlers are the functions where your application's logic lives. This is where you'll interact with your database, call other APIs, or perform any other actions. `mcpresso` automatically maps these handlers to MCP tools that an agent can call.

## Defining Resources

### Basic CRUD
`mcpresso` automatically generates standard Create, Read, Update, Delete, and List tools based on the handlers you provide.

```typescript
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  handlers: {
    // Corresponds to GET /notes/{id}
    get: async ({ id }) => db.notes.findUnique({ where: { id } }),
    
    // Corresponds to `list_notes` tool
    list: async () => db.notes.findMany(),
    
    // Corresponds to `create_note` tool
    create: async (data) => db.notes.create({ data }),
    
    // Corresponds to `update_note` tool
    update: async ({ id, ...data }) => db.notes.update({ where: { id }, data }),
    
    // Corresponds to `delete_note` tool
    delete: async ({ id }) => db.notes.delete({ where: { id } }),
  },
});
```

### Fine-Grained Control with `methodConfig`
You often don't want to expose every field for every operation. The `methodConfig` option gives you precise control over the schemas for the `create` and `update` tools.

**Omitting fields for `create`:**
Prevent agents from setting server-managed fields like `id` and `createdAt`.

```typescript
methodConfig: {
  create: {
    // The `create_note` tool will not include these fields
    omit: ['id', 'createdAt', 'updatedAt'],
  },
}
```

**Picking fields for `update`:**
Ensure agents can only modify specific fields. The `id` is always required.

```typescript
methodConfig: {
  update: {
    // The `update_note` tool will ONLY allow these fields
    pick: ['content', 'tagIds'],
  },
}
```

## Handling Relationships

You can declare relationships between resources, and `mcpresso` will automatically enrich the exposed JSON schemas with standard `$ref` links. This helps language models understand how your data is connected.

The `relations` key maps a field in your schema to another resource type.

```typescript
const NoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(), // Foreign key to User
  tagIds: z.array(z.string()), // Foreign keys to Tag
  createdAt: z.date(),
});

const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  relations: {
    // A single relationship
    authorId: { type: 'user' },
    
    // A one-to-many relationship
    tagIds: { type: 'tag' },
  },
  // ... handlers
});
```

When this resource's type is exposed, the `authorId` property in the JSON schema will be replaced with a `$ref` to the `user` type, like `"$ref": "type://my_server/user"`.

## Search & Custom Methods

Go beyond basic CRUD by adding powerful search capabilities and custom, domain-specific tools.

### Adding Search
Implement a dedicated `search` tool with a custom input schema. The handler should return an array of resource instances.

```typescript
const noteResource = createResource({
  // ...
  methodConfig: {
    search: {
      schema: z.object({
        query: z.string().describe("Text to search for in note content."),
        authorId: z.string().optional().describe("Filter by author."),
      }),
    },
  },
  handlers: {
    search: async ({ query, authorId }) => {
      // your search logic here...
      return db.notes.findMany({ where: { ... } });
    },
    // ... other handlers
  },
});
```

### Adding Custom Tools (`customMethods`)
For anything else, use the `customMethods` block to define completely custom tools. Provide a name, description, input schema, and handler for each.

```typescript
const noteResource = createResource({
  // ...
  customMethods: {
    count_by_author: {
      description: "Counts how many notes a specific author has written.",
      inputSchema: z.object({
        authorId: z.string().describe("The ID of the author to count notes for."),
      }),
      handler: async ({ authorId }) => {
        const count = await db.notes.count({ where: { authorId } });
        return { count };
      },
    },
  },
  // ... handlers
});
```
This will create a new tool named `count_by_author_note`.

## Type Exposure

To enable language models to understand your API, `mcpresso` can automatically expose your resource schemas. When enabled, it creates a read-only resource for each type at `type://<server_name>/<resource_name>`.

This exposed type information includes:
- The resource's JSON Schema (with relationships resolved to `$ref`s).
- A list of all related tools.
- A template URI for querying specific instances of the resource.

Enable it via the `exposeTypes` server configuration option.

```typescript
const server = createMCPServer({
  name: "my_server",
  serverUrl: "http://localhost:3080",
  resources: [noteResource, userResource, tagResource],
  // Expose types for all registered resources
  exposeTypes: true, 
  
  // Or, expose types for only specific resources
  // exposeTypes: [noteResource, userResource],
});
```

## Authentication

Secure your MCP server with OAuth 2.1. `mcpresso` implements the MCP authorization specification, requiring a valid JWT Bearer token for all requests.

Simply provide your authorization server's issuer URL. The library handles advertising the server's security requirements via the standard `/.well-known/oauth-protected-resource-metadata` endpoint and validating incoming tokens.

```typescript
const server = createMCPServer({
  name: "my_secure_server",
  serverUrl: "https://my-mcp-server.com",
  resources: [noteResource],
  auth: {
    // The issuer URL of your OIDC-compliant authorization server
    // e.g., 'https://your-auth-server.com' or 'https://accounts.google.com'
    issuer: 'https://your-auth-server.com',
  },
});
```

## Full Example

A complete example demonstrating most of these features is available in `packages/mcpresso/examples/mcpresso.ts` within the repository. 