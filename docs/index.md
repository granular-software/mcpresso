# Documentation

Welcome to the mcpresso documentation. This guide will help you build MCP servers quickly and efficiently.

## Getting Started

- **[Getting Started](./getting-started.md)** - Quick start guide for new users
- **[CLI Reference](./cli-reference.md)** - Complete CLI command reference

## Core Concepts

- **[Core Concepts](./core-concepts.md)** - Complete guide to mcpresso fundamentals

## Examples

Browse working examples in the [examples](../examples/) directory:

- **Getting Started**
  - [Hello World](../examples/hello-world.ts) - Minimal working server
  - [Basic CRUD](../examples/basic-crud.ts) - Resource management
  - [With Auth](../examples/with-auth.ts) - Authentication

## Quick Reference

### Basic Server Setup
```ts
import { createMCPServer, createResource } from "mcpresso";

const server = createMCPServer({
  name: "my_server",
  resources: [userResource],
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

### Resource Definition
```ts
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    get: { handler: async ({ id }) => getUser(id) },
    list: { handler: async () => listUsers() },
    create: { handler: async (data) => createUser(data) },
  },
});
```

### Authentication
```ts
const server = createMCPServer({
  name: "auth_server",
  resources: [userResource],
  auth: {
    issuer: "https://auth.example.com",
    serverUrl: "https://api.example.com",
    jwtSecret: process.env.JWT_SECRET,
  },
});
```

## Need Help?

- **GitHub Issues**: Report bugs and request features
- **Examples**: Study working code examples
- **MCP Specification**: Learn about the [Model Context Protocol](https://modelcontextprotocol.io/) 