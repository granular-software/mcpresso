# Authentication

mcpresso supports multiple authentication modes to fit different deployment scenarios.

## Authentication Modes

### 1. No Authentication
Perfect for development and public APIs.

```ts
const server = createMCPServer({
  name: "public_api",
  resources: [userResource],
  // No auth field = no authentication
});
```

### 2. Bearer Token
Simple token-based authentication for internal APIs. Be careful, this authentication mode will work for local tests but is not compliant with the MCP specification.

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
        email: "api@company.com",
        scopes: ["read", "write", "admin"]
      }
    }
  },
});
```

### 3. External OAuth Server
Use a separate OAuth server for authentication.

```ts
const server = createMCPServer({
  name: "enterprise_api",
  resources: [userResource],
  auth: {
    issuer: "https://auth.company.com",
    serverUrl: "https://api.company.com",
    jwtSecret: "shared-secret",
    userLookup: async (jwtPayload) => {
      const user = await db.users.findById(jwtPayload.sub);
      return user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        scopes: user.permissions,
      } : null;
    }
  },
});
```

### 4. Integrated OAuth Server
Run OAuth and MCP servers on the same port. This is recommended for production use, as is best follows the MCP specification. You may use the `template-docker-oauth-postgresql` template to get started and spin up a production-ready OAuth server + an authentication database in minutes.

```ts
import { MCPOAuthServer } from "mcpresso-oauth-server";

const oauthServer = new MCPOAuthServer({
  issuer: "http://localhost:4000",
  serverUrl: "http://localhost:4000", 
  jwtSecret: "dev-secret-key",
  auth: {
    authenticateUser: async (credentials) => {
      const user = await db.users.findByEmail(credentials.username);
      return user && await bcrypt.compare(credentials.password, user.hashedPassword) ? user : null;
    }
  }
}, storage);

const server = createMCPServer({
  name: "integrated_server",
  resources: [userResource],
  auth: {
    oauth: oauthServer,
    serverUrl: "http://localhost:4000",
    userLookup: async (jwtPayload) => {
      return await db.users.findById(jwtPayload.sub);
    }
  },
});
```

## Handler Signature with Authentication

When authentication is enabled, handlers receive the authenticated user as a second parameter:

```ts
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    get: {
      handler: async ({ id }, user) => {
        // user contains the full user profile
        console.log("Authenticated user:", user?.id, user?.email);
        return users.find((u) => u.id === id);
      },
    },
    list: {
      handler: async (_, user) => {
        if (!user) throw new Error("Authentication required");
        return users.filter(u => user.scopes.includes('admin') || u.id === user.id);
      },
    },
  },
});
```

## Examples

- **No Auth**: [Simple Example](../examples_2/simple.ts)
- **Bearer Token**: [Bearer Token Demo](../examples_2/bearer-token-demo.ts)
- **External OAuth**: [Separate Servers Demo](../examples_2/separate-servers-demo.ts)  
- **Integrated OAuth**: [OAuth2 Simple Demo](../examples_2/oauth2-simple-demo.ts) 