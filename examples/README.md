# mcpresso Examples

Working examples that demonstrate mcpresso features progressively.

## Learning Path

Start with the first example and work your way up:

### 1. [hello-world.ts](./hello-world.ts) - Minimal Server
**Lines:** 25 | **Port:** 3000
- Absolute minimum to start an MCP server
- No resources, just protocol compliance
- Perfect for understanding the basics

### 2. [basic-crud.ts](./basic-crud.ts) - Resource Management  
**Lines:** 95 | **Port:** 3000
- Create a resource with full CRUD operations
- Automatic MCP tool generation
- Type-safe validation with Zod

### 3. [with-auth.ts](./with-auth.ts) - Authentication
**Lines:** 130 | **Port:** 3000
- Add bearer token authentication
- User-specific data access
- Multi-tenant architecture

### 4. [custom-methods.ts](./custom-methods.ts) - Custom Business Logic
**Lines:** 200+ | **Port:** 3000
- Extend resources with custom methods beyond CRUD
- Implement complex business logic
- Search, analytics, and bulk operations

### 5. [multi-tenancy.ts](./multi-tenancy.ts) - Multi-Tenant Architecture
**Lines:** 300+ | **Port:** 3000
- Organization-based data isolation
- Role-based access control (admin/user)
- User data injection and scope-based security

### 6. [rate-limiting.ts](./rate-limiting.ts) - Server Protection
**Lines:** 25 | **Port:** 3000
- Configure built-in rate limiting
- Protect against abuse and ensure fair usage
- Customizable time windows and limits

### 7. [retry-with-backoff.ts](./retry-with-backoff.ts) - Resilience
**Lines:** 25 | **Port:** 3000
- Automatic retry with exponential backoff
- Handle transient failures gracefully
- Configurable retry strategies

### 8. [server-metadata.ts](./server-metadata.ts) - Server Information
**Lines:** 35 | **Port:** 3000
- Expose server capabilities as MCP resources
- Help AI agents understand your server
- Version, description, and feature flags

## Running Examples

1. **Navigate to examples directory:**
   ```bash
   cd examples
   ```

2. **Run an example:**
   ```bash
   # Hello World
   npx tsx hello-world.ts
   
   # Basic CRUD
   npx tsx basic-crud.ts
   
   # With Authentication
   npx tsx with-auth.ts
   
   # Custom Methods
   npx tsx custom-methods.ts
   
   # Multi-Tenancy
   npx tsx multi-tenancy.ts
   
   # Rate Limiting
   npx tsx rate-limiting.ts
   
   # Retry with Backoff
   npx tsx retry-with-backoff.ts
   
   # Server Metadata
   npx tsx server-metadata.ts
   ```

## What Each Example Teaches

- **hello-world.ts**: Server creation, MCP compliance
- **basic-crud.ts**: Resource definition, automatic tool generation
- **with-auth.ts**: Authentication, user data isolation
- **custom-methods.ts**: Business logic, custom operations, search and analytics
- **multi-tenancy.ts**: Data isolation, access control, user management
- **rate-limiting.ts**: Server protection, abuse prevention
- **retry-with-backoff.ts**: Error handling, resilience, transient failure management
- **server-metadata.ts**: Server information, AI agent understanding

## Next Steps

After running these examples:
1. Try the CLI: `npx mcpresso init my-server`
2. Read the [Core Concepts](../docs/core-concepts.md) guide
3. Build your own server with real data 