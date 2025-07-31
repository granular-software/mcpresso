# mcpresso

**mcpresso** is a lightweight, powerful TypeScript library for rapidly building [Model Context Protocol (MCP)](https://modelcontextprotocol.io/overview) servers. It simplifies the process of exposing your data models and business logic as fully compliant MCP resources and tools, enabling seamless integration with AI agents and language models.

With a strong focus on developer experience, type safety, and flexibility, `mcpresso` allows you to:

* ✅ **Define Resources with Zod**: Use [Zod](https://zod.dev/) schemas to define your data models—`mcpresso` handles validation and type inference.
* ⚙️ **Auto-Generate CRUD Tools**: Automatically expose standard tools (`create`, `update`, `delete`, `list`) from your resource handlers.
* 📘 **Expose JSON Type Schemas**: Generate machine-readable schemas to help models understand your data structure.
* 🔗 **Model Relationships**: Easily define and link related resources using standardized schema references.
* 🔐 **Add Authentication Fast**: Secure your server with OAuth 2.1 in just a few lines.
* 🧠 **Extend with Custom Logic**: Create custom tools and advanced methods tailored to your application's domain.

An unopinionated, "bring your own" server toolkit for the Model-Context Protocol (MCP).

**Note: This package is experimental and subject to breaking changes.**

---

## 🚀 How to Get Started

The fastest way to create your first MCPresso server is using our CLI:

```bash
# Create a new project in seconds
mcpresso init

# Follow the interactive prompts to configure your server
# Choose from available templates or use a custom GitHub URL
# Configure your project name and description

# Start development
cd my-mcpresso-server
npm run dev

# Build for production
npm run build
npm start
```

For a complete step-by-step guide, see our **[Get Started Guide](./docs/get-started.md)**.

---

## 📦 Installation

### CLI Installation

Install the mcpresso CLI globally:

```bash
npm install -g mcpresso
```

Or use npx (no installation required):

```bash
npx mcpresso init
```

### Library Installation

Install `mcpresso` as a library via your preferred package manager:

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

Create a new MCP server in seconds:

```bash
# Create a new project
mcpresso init

# Follow the prompts to configure your server
# Choose from available templates or use a custom GitHub URL
# Configure your project name and description

# Start development
cd my-mcpresso-server
npm run dev

# Build for production
npm run build
npm start
```

Or use the library directly:

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
  methods: {
    get: {
      handler: async ({ id }, user) => users.find((u) => u.id === id),
    },
    list: {
      handler: async (_, user) => users,
    },
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

## 🚀 CLI Commands

The mcpresso CLI provides powerful tools for managing your MCP servers:

### Quick Commands

```bash
# Create a new project
mcpresso init

# List available templates
mcpresso list

# Get template information
mcpresso info <template-id>

# Start development server
mcpresso dev

# Build for production
mcpresso build
```

### Detailed Command Reference

#### `mcpresso init`
Creates a new mcpresso project with interactive prompts.

**Options:**
- `-y, --yes` - Skip prompts and use defaults
- `-t, --template <template>` - Template ID to use
- `-n, --name <name>` - Project name
- `-d, --description <description>` - Project description

**Examples:**
```bash
# Interactive setup
mcpresso init

# Quick setup with specific template
mcpresso init --template template-express-no-auth --name my-api --yes

# Custom GitHub template
mcpresso init --template https://github.com/user/custom-template.git
```

#### `mcpresso list`
Lists all available templates.

**Examples:**
```bash
# List all templates
mcpresso list

# Filter by category
mcpresso list --category express
```

#### `mcpresso info <template-id>`
Shows detailed information about a specific template.

**Examples:**
```bash
# Get template details
mcpresso info template-docker-oauth-postgresql

# Get info by URL
mcpresso info https://github.com/user/custom-template.git
```

#### `mcpresso dev`
Starts the development server with hot reload.

**Options:**
- `-p, --port <port>` - Port to run on (default: 3000)
- `-h, --host <host>` - Host to bind to (default: localhost)

**Examples:**
```bash
# Default development server
mcpresso dev

# Custom port
mcpresso dev -p 4000

# Custom host
mcpresso dev -h 0.0.0.0
```

#### `mcpresso build`
Builds the project for production.

**Options:**
- `--clean` - Clean build directory before building

**Examples:**
```bash
# Standard build
mcpresso build

# Clean build
mcpresso build --clean
```



## 🎯 Available Templates

mcpresso provides several production-ready templates to choose from:

### Official Templates

| Template | Description | Category | Auth | Complexity |
|----------|-------------|----------|------|------------|
| **Docker + OAuth2.1 + PostgreSQL** | Production-ready MCP server with OAuth2.1 authentication and PostgreSQL database | Docker | OAuth | Medium |
| **Express + OAuth2.1 + SQLite** | Simple MCP server with OAuth2.1 authentication using SQLite database | Express | OAuth | Easy |
| **Express + No Authentication** | Simple MCP server without authentication for public APIs | Express | None | Easy |

### Template Features

Each template includes:
- ✅ **Complete TypeScript setup** with proper configuration
- ✅ **Express.js server** with MCP integration
- ✅ **Example resources** with CRUD operations
- ✅ **Environment variable configuration** with `.env.example`
- ✅ **Development and production scripts** ready to use
- ✅ **Comprehensive documentation** with usage examples
- ✅ **Health check endpoints** for monitoring
- ✅ **Proper error handling** and logging

### Using Templates

```bash
# List all available templates
mcpresso list

# Get detailed information about a template
mcpresso info template-docker-oauth-postgresql

# Create a project from a specific template
mcpresso init my-project --template template-express-no-auth --yes

# Use a custom GitHub template
mcpresso init my-project --template https://github.com/user/custom-template.git

### Creating Custom Templates

You can create your own templates and share them with the community:

1. **Create a template repository** on GitHub with the following structure:
   ```
   your-template/
   ├── template.json          # Template metadata
   ├── package.json           # Dependencies and scripts
   ├── README.md             # Documentation
   ├── .env.example          # Environment variables
   ├── tsconfig.json         # TypeScript config
   └── src/
       ├── server.ts         # Main server file
       └── resources/        # MCP resources
   ```

2. **Use your template**:
   ```bash
   mcpresso init my-project --template https://github.com/user/your-template.git
   ```

3. **Share with the community** by adding it to the [mcpresso templates list](https://github.com/granular-software/mcpresso).

For detailed template creation guidelines, see our [Template Creation Guide](./docs/template-creation.md).



## 🔧 Environment Variables

Each template includes a `.env.example` file with the appropriate environment variables:

### Common Variables
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
SERVER_URL=http://localhost:3000
```

### OAuth 2.1 Variables (OAuth templates)
```bash
# OAuth Configuration
OAUTH_ISSUER=http://localhost:3000
JWT_SECRET=your-secret-key-change-this-in-production
```

### Template-Specific Variables
- **Docker + PostgreSQL**: `DATABASE_URL`, `NODE_ENV=production`
- **Express + SQLite**: `DATABASE_PATH`, `JWT_SECRET`
- **Express + No Auth**: `PORT`, `SERVER_URL`

## 🚀 Deployment

Each template includes deployment instructions in its README.

## 🚨 Troubleshooting

### Common Issues

**CLI not found:**
```bash
# Use npx (recommended)
npx mcpresso init

# Or install globally
npm install -g mcpresso
```

**Build fails:**
```bash
# Install dependencies
npm install

# Check TypeScript errors
npm run typecheck
```

**Deployment fails:**
- Verify platform credentials are configured
- Check network connectivity
- Review platform-specific logs

**Server not responding:**
- Check environment variables in `.env`
- Verify the server is running on the correct port
- Review server logs

### Template-Specific Issues

**Docker template:**
- Ensure Docker and Docker Compose are installed
- Check if port 3000 is available
- Verify PostgreSQL connection string

**Express templates:**
- Check if port 3000 is available
- Verify environment variables are set
- Ensure Node.js 18+ is installed

### Getting Help

- Check the [mcpresso documentation](https://github.com/granular-software/mcpresso)
- Review platform-specific documentation
- Open an issue on GitHub

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
  methods: {
    get: {
      handler: async ({ id }, user) => db.notes.findUnique({ where: { id } }),
    },
    list: {
      handler: async (_, user) => db.notes.findMany(),
    },
    create: {
      handler: async (data, user) => db.notes.create({ data }),
    },
    update: {
      handler: async ({ id, ...data }, user) => db.notes.update({ where: { id }, data }),
    },
    delete: {
      handler: async ({ id }, user) => db.notes.delete({ where: { id } }),
    },
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
      handler: async ({ query, authorId }, user) => {
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
      handler: async ({ authorId }, user) => {
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

`mcpresso` supports four authentication modes to fit different deployment scenarios:

1. **No Authentication** - Perfect for development and public APIs
2. **Bearer Token** - Simple token-based authentication for internal APIs
3. **External OAuth** - Use a separate OAuth server for enterprise environments 
4. **Integrated OAuth** - All-in-one deployment with built-in OAuth server

### Mode 1: No Authentication

The simplest setup - no authentication configuration needed:

```ts
const server = createMCPServer({
  name: "public_api",
  resources: [userResource],
  // No auth field = no authentication
});
```

All endpoints are public and no Bearer tokens are required.

### Mode 2: Bearer Token Authentication

Simple token-based authentication for internal APIs and services:

```ts
const server = createMCPServer({
  name: "internal_api",
  resources: [userResource],
  auth: {
    bearerToken: {
      headerName: "Authorization", // Optional, defaults to "Authorization"
      token: "sk-1234567890abcdef",
      userProfile: {
        id: "api-client",
        username: "internal-service",
        email: "api@company.com",
        scopes: ["read", "write", "admin"]
      }
    }
  },
});
```

**Benefits:**
- ✅ Simple setup - just provide a token
- ✅ No external dependencies
- ✅ Fast authentication (no network calls)
- ✅ Perfect for internal APIs and services
- ✅ Great for development and testing

**Use Cases:**
- Internal microservices communication
- API gateways and proxies
- Development and testing environments
- Simple client-server applications

### Mode 3: External OAuth Server

Use a separate OAuth server for authentication:

```ts
const server = createMCPServer({
  name: "enterprise_api",
  resources: [userResource],
  auth: {
    issuer: "https://auth.company.com",        // OAuth server URL
    serverUrl: "https://api.company.com",      // This MCP server URL
    jwtSecret: "shared-secret",                // Same secret as OAuth server
    userLookup: async (jwtPayload) => {
      // Fetch full user profile from your database
      const user = await db.users.findById(jwtPayload.sub);
      return user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        scopes: user.permissions,
        profile: user.profile
      } : null;
    }
  },
});
```

**Architecture:**
```
┌─────────────────┐    ┌──────────────────┐
│   OAuth Server  │    │    MCP Server    │
│   (Port 4001)   │    │   (Port 4000)    │ 
│                 │    │                  │
│ • Login UI      │    │ • API Endpoints  │
│ • User Auth     │    │ • Token Validation│
│ • Token Issue   │    │ • Resource Access│
└─────────────────┘    └──────────────────┘
```

### Mode 4: Integrated OAuth Server

Run OAuth and MCP servers on the same port using `mcpresso-oauth-server`:

```ts
import { MCPOAuthServer } from "mcpresso-oauth-server";

// Create OAuth server
const oauthServer = new MCPOAuthServer({
  issuer: "http://localhost:4000",
  serverUrl: "http://localhost:4000", 
  jwtSecret: "dev-secret-key",
  auth: {
    authenticateUser: async (credentials, context) => {
      // Your login logic
      const user = await db.users.findByEmail(credentials.username);
      return user && await bcrypt.compare(credentials.password, user.hashedPassword) ? user : null;
    },
    renderLoginPage: async (context, error) => {
      // Custom login UI (optional)
      return `<html>...login form...</html>`;
    }
  }
}, storage);

// Create MCP server with integrated OAuth
const server = createMCPServer({
  name: "integrated_server",
  resources: [userResource],
  auth: {
    oauth: oauthServer,                        // Integrate OAuth server
    serverUrl: "http://localhost:4000",
    userLookup: async (jwtPayload) => {
      // Fetch full user profiles
      return await db.users.findById(jwtPayload.sub);
    }
  },
});
```

**Architecture:**
```
┌─────────────────────────────────┐
│        Integrated Server        │
│         (Port 4000)             │
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │
│ │OAuth Service│ │ MCP Service │ │
│ │• Login UI   │ │• API Access │ │
│ │• User Auth  │ │• Resources  │ │
│ │• Tokens     │ │• Tools      │ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────┘
```

### Handler Signature with Authentication

When authentication is enabled, handlers receive the authenticated user as a second parameter:

```ts
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    get: {
      handler: async ({ id }, user) => {
        // user contains the full user profile (from userLookup)
        console.log("Authenticated user:", user?.id, user?.email);
        return users.find((u) => u.id === id);
      },
    },
    list: {
      handler: async (_, user) => {
        // user is undefined if no auth, UserProfile if authenticated
        if (!user) throw new Error("Authentication required");
        return users.filter(u => user.scopes.includes('admin') || u.id === user.id);
      },
    },
  },
});
```

### User Profile vs JWT Payload

- **Without `userLookup`**: `user` parameter contains raw JWT payload (`sub`, `iss`, `aud`, etc.)
- **With `userLookup`**: `user` parameter contains rich user profile from your database

### Advanced Configuration

Fine-tune JWT validation and error handling:

```ts
auth: {
  issuer: "https://auth.example.com",
  serverUrl: "https://api.example.com",
  jwtSecret: "shared-secret",
  
  // JWT validation options
  jwtOptions: {
    clockTolerance: 30,     // 30 seconds tolerance for clock skew
    maxTokenAge: 3600,      // Reject tokens older than 1 hour
  },
  
  // Error handling
  errorHandling: {
    includeDetails: false,  // Don't expose internal details in production
    messages: {
      missingToken: 'Authentication required',
      invalidToken: 'Invalid token',
      expiredToken: 'Token expired',
    }
  },
  
  // Logging
  logging: {
    logSuccess: false,      // Don't log successful auths
    logFailures: true,      // Log failed auths
  },
}
```

### Examples

See complete working examples in the [examples](./examples/) directory:

- **No Auth**: [`examples/no-auth-demo.ts`](./examples/no-auth-demo.ts)
- **Bearer Token**: [`examples/bearer-token-demo.ts`](./examples/bearer-token-demo.ts)
- **External OAuth**: [`examples/separate-servers-demo.ts`](./examples/separate-servers-demo.ts)  
- **Integrated OAuth**: [`examples/oauth2-simple-demo.ts`](./examples/oauth2-simple-demo.ts)

For production-ready templates with authentication, see our [Available Templates](#-available-templates) section.

### Authentication Features

When authentication is enabled, `mcpresso` automatically:

- ✅ **Protects all endpoints** - Only valid Bearer tokens allowed
- ✅ **Validates JWTs** - Signature and expiration verification  
- ✅ **Injects user data** - Rich user profiles available in handlers
- ✅ **Exposes metadata** - OAuth discovery at `/.well-known/oauth-protected-resource`
- ✅ **Production ready** - Security defaults with full customization

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

## 🎭 Server Side Events

### Notifications

When tools are added or removed, the server sends notifications to connected clients using the standard MCP notification format:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/list_changed",
  "params": {}
}
```

This follows the MCP specification for tool list change notifications. Clients should respond to this notification by calling `tools/list` to get the updated list of available tools.

### SSE Streaming

Connect to the server via SSE to receive real-time notifications:

```bash
curl -H "Accept: text/event-stream" http://localhost:3000/
```

A standalone example demonstrating this feature is available at [`packages/mcpresso/examples/dynamic-tools.ts`](./examples/dynamic-tools.ts).

---

## 📁 Full Example

A complete example showing most features is available at:

```
packages/mcpresso/examples/mcpresso.ts
```

## Documentation

- [Getting Started Guide](./docs/get-started.md)
- [Template Creation Guide](./docs/template-creation.md)

`