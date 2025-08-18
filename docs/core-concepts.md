# Core Concepts

Learn the fundamental concepts of mcpresso and how to build MCP servers.

## What is mcpresso?

mcpresso is a TypeScript library that handles the complex parts of building MCP servers so you can focus on your business logic.

Instead of manually implementing:
- MCP protocol specification
- Authentication systems  
- Resource management
- Request validation
- Error handling

You define your data models and mcpresso handles the rest.

## Resources

A **Resource** is the core concept in mcpresso. It represents a type of data that your server manages.

### Basic Resource

```ts
const userResource = createResource({
  name: "user",                    // Resource name
  schema: UserSchema,              // Data validation schema
  uri_template: "users/{id}",      // URI pattern
  methods: {                       // Available operations
    get: { handler: async ({ id }) => getUser(id) },
    list: { handler: async () => listUsers() },
    create: { handler: async (data) => createUser(data) },
    update: { handler: async ({ id, ...data }) => updateUser(id, data) },
    delete: { handler: async ({ id }) => deleteUser(id) },
  },
});
```

### What This Creates

From this single resource definition, mcpresso automatically generates:

- **MCP Tools**: `get_user`, `list_users`, `create_user`, `update_user`, `delete_user`
- **Endpoints**: `GET /users/{id}`, `GET /users`, `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}`
- **Schema Exposure**: `schema://server_name/user` for AI agent understanding

## Schemas

Use [Zod](https://zod.dev/) to define your data models with validation:

```ts
const UserSchema = z.object({
  id: z.string().readonly(),           // Auto-generated, read-only
  name: z.string().min(1, "Required"), // Required string
  email: z.string().email(),           // Valid email format
  age: z.number().min(0),              // Non-negative number
  createdAt: z.date().readonly(),      // Auto-set, read-only
});

// Type inference
type User = z.infer<typeof UserSchema>;
```

### Schema Features

- **Validation**: Automatic request/response validation
- **Type Safety**: Full TypeScript support
- **Error Messages**: Custom validation error messages
- **Read-only Fields**: Use `.readonly()` for auto-generated fields

## Authentication

mcpresso supports three authentication modes:

### 1. No Authentication
```ts
const server = createMCPServer({
  name: "public_api",
  resources: [userResource],
  // No auth field = public access
});
```

### 2. Bearer Token
```ts
const server = createMCPServer({
  name: "internal_api",
  resources: [userResource],
  auth: {
    bearerToken: {
      token: "sk-1234567890abcdef",
      userProfile: {
        id: "api-client",
        username: "internal-service",
        scopes: ["read", "write"],
      },
    },
  },
});
```

### 3. OAuth2.1
For production OAuth2.1 authentication, see the [Docker OAuth + PostgreSQL Template](https://github.com/your-org/joshu/tree/main/apps/template-docker-oauth-postgresql) which provides a complete, production-ready implementation.

```ts
const server = createMCPServer({
  name: "production_api",
  resources: [userResource],
  auth: {
    issuer: "https://auth.example.com",
    serverUrl: "https://api.example.com",
    jwtSecret: process.env.JWT_SECRET,
    userLookup: async (jwtPayload) => {
      return await db.users.findById(jwtPayload.sub);
    },
  },
});
```

## Relationships

Define relationships between resources to help AI agents understand your data:

```ts
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  relations: {
    authorId: { type: "user" },      // Note belongs to one user
    tagIds: { type: "tag" },         // Note can have multiple tags
  },
  methods: { /* ... */ },
});
```

This creates enhanced schemas with `$ref` links that AI agents can use to understand relationships.

## Custom Methods

Add business logic beyond standard CRUD:

```ts
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    // Standard CRUD methods...
    
    // Custom business logic
    search: {
      description: "Search users by name or email",
      inputSchema: z.object({
        query: z.string().describe("Search term"),
        limit: z.number().optional().describe("Maximum results"),
      }),
      handler: async ({ query, limit = 10 }) => {
        return searchUsers(query, limit);
      },
    },
    
    count_by_role: {
      description: "Count users by role",
      inputSchema: z.object({
        role: z.string().describe("Role to count"),
      }),
      outputSchema: z.object({
        count: z.number(),
        role: z.string(),
      }),
      handler: async ({ role }) => {
        const count = await countUsersByRole(role);
        return { count, role };
      },
    },
  },
});
```

## Server Configuration

Configure your server with built-in features:

```ts
const server = createMCPServer({
  name: "my_server",
  resources: [userResource, noteResource],
  
  // Expose schemas for AI agents
  exposeTypes: true,
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,                // 100 requests per window per IP
  },
  
  // Automatic retries
  retry: {
    retries: 3,                // 3 retry attempts
    factor: 2,                 // Exponential backoff
    minTimeout: 1000,          // Start with 1 second
    maxTimeout: 10000,         // Cap at 10 seconds
  },
  
  // Server metadata
  serverMetadata: {
    name: "My API Server",
    version: "1.0.0",
    description: "User and note management API",
    capabilities: {
      authentication: true,
      rateLimiting: true,
      retries: true,
    },
  },
});
```

## Handler Signature

Your handler functions receive data and optional user context:

```ts
// Without authentication
handler: async (data) => {
  // data contains the request parameters
  return processData(data);
}

// With authentication  
handler: async (data, user) => {
  // data contains the request parameters
  // user contains the authenticated user profile (or undefined if no auth)
  
  if (!user) throw new Error("Authentication required");
  
  // Use user.id, user.scopes, etc.
  return processDataForUser(data, user);
}
```

## Error Handling

mcpresso automatically handles MCP protocol errors. Just throw errors in your handlers:

```ts
handler: async ({ id }) => {
  const user = await getUser(id);
  
  if (!user) {
    throw new Error(`User ${id} not found`);
  }
  
  return user;
}
```

mcpresso converts this to proper MCP error responses.

## Type Exposure

With `exposeTypes: true`, mcpresso exposes your schemas as MCP resources:

- `schema://server_name/user` - User schema definition
- `schema://server_name/note` - Note schema definition

This helps AI agents understand your data structure and available operations.

## Next Steps

1. **Try the examples** in the [examples](../examples/) directory
2. **Build your first server** with `npx mcpresso init`
3. **Explore advanced features** like custom methods and relationships
4. **Deploy to production** using the Docker templates 