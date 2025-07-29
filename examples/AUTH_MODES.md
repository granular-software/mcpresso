# MCP Server Authentication Modes

The `@mcpresso` library supports four authentication modes, each designed for different use cases:

## 🔓 **Mode 1: No Authentication**

**When to use:** Public APIs, development, testing, non-sensitive data

**Example:** `no-auth-demo.ts`

```typescript
const app = createMCPServer({
  name: "public_api_server",
  resources: [userResource],
  // No auth field = no authentication
});
```

**Benefits:**
- ✅ Simplest setup possible
- ✅ No token management
- ✅ Perfect for public APIs
- ✅ Great for development/testing

**Drawbacks:**
- ❌ No access control
- ❌ All data publicly accessible
- ❌ Not suitable for sensitive data

---

## 🔑 **Mode 2: Bearer Token Authentication**

**When to use:** Simple API authentication, internal services, development/testing with controlled access

**Example:** `bearer-token-demo.ts`

```typescript
const app = createMCPServer({
  name: "api_server",
  resources: [userResource],
  auth: {
    bearerToken: {
      headerName: "Authorization", // Optional, defaults to "Authorization"
      token: "sk-1234567890abcdef",
      userProfile: {
        id: "api-client",
        username: "demo-client", 
        email: "client@example.com",
        scopes: ["read", "write", "admin"]
      }
    }
  }
});
```

**Architecture:**
```
┌─────────────────┐
│   MCP Server    │
│   (Port 4000)   │
│                 │
│ • API Endpoints │
│ • Token Check   │
│ • Resource Access│
└─────────────────┘
```

**Benefits:**
- ✅ Simple setup and deployment
- ✅ No external dependencies
- ✅ Fast authentication (no network calls)
- ✅ Perfect for internal APIs
- ✅ Great for development/testing

**Drawbacks:**
- ❌ Limited security (single token)
- ❌ No user management
- ❌ No token expiration
- ❌ Not suitable for multi-user systems

---

## 🔗 **Mode 3: External OAuth Server**

**When to use:** Separate auth service, microservices architecture, existing OAuth server

**Example:** `separate-servers-demo.ts`

```typescript
// OAuth Server (Port 4001)
const oauthServer = new MCPOAuthServer({
  issuer: "http://localhost:4001",
  serverUrl: "http://localhost:4001", 
  jwtSecret: "secret",
  auth: {
    authenticateUser: async (credentials) => { /* login logic */ },
    renderLoginPage: async (context) => { /* custom UI */ }
  }
}, storage);

// MCP Server (Port 4000) 
const mcpApp = createMCPServer({
  name: "api_server",
  resources: [userResource],
  auth: {
    issuer: "http://localhost:4001",        // Point to OAuth server
    serverUrl: "http://localhost:4000",     // This server's URL
    jwtSecret: "secret",                    // Same secret for verification
    userLookup: async (jwt) => { /* fetch user profile */ }
  }
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

**Benefits:**
- ✅ Separation of concerns
- ✅ OAuth server can serve multiple APIs
- ✅ Dedicated auth service
- ✅ Scales well

**Drawbacks:**
- ❌ More complex deployment (2 servers)
- ❌ Network calls between services
- ❌ Shared secret management

---

## 🔒 **Mode 4: Integrated OAuth Server**

**When to use:** All-in-one deployments, simpler architecture, single server preference

**Example:** `oauth2-simple-demo.ts`

```typescript
// Create OAuth server
const oauthServer = new MCPOAuthServer({
  issuer: "http://localhost:4000",
  serverUrl: "http://localhost:4000",
  jwtSecret: "secret",
  auth: {
    authenticateUser: async (credentials) => { /* login logic */ },
    renderLoginPage: async (context) => { /* custom UI */ }
  }
}, storage);

// Create MCP server with integrated OAuth
const app = createMCPServer({
  name: "integrated_server",
  resources: [userResource],
  auth: {
    oauth: oauthServer,                     // Integrate OAuth server
    serverUrl: "http://localhost:4000",
    userLookup: async (jwt) => { /* fetch user profile */ }
  }
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

**Benefits:**
- ✅ Single server deployment
- ✅ No network overhead
- ✅ Shared configuration
- ✅ Simpler DevOps

**Drawbacks:**
- ❌ Monolithic architecture
- ❌ Auth tied to API server
- ❌ Less separation of concerns

---

## 🚀 **Quick Start Guide**

### 1. **No Auth** (Fastest)
```bash
bun run packages/mcpresso/examples/no-auth-demo.ts
```

### 2. **Bearer Token** (Simple API Auth)
```bash
bun run packages/mcpresso/examples/bearer-token-demo.ts
```

### 3. **External OAuth** (Production-ready)
```bash
# Terminal 1: OAuth Server
bun run packages/mcpresso/examples/separate-servers-demo.ts

# Servers will start automatically on ports 4001 (OAuth) and 4000 (MCP)
```

### 4. **Integrated OAuth** (All-in-one)
```bash
bun run packages/mcpresso/examples/oauth2-simple-demo.ts
```

## 🔧 **Configuration Comparison**

| Feature | No Auth | Bearer Token | External OAuth | Integrated OAuth |
|---------|---------|--------------|----------------|------------------|
| **Setup Complexity** | Minimal | Simple | Moderate | Simple |
| **Deployment** | 1 server | 1 server | 2 servers | 1 server |
| **Configuration** | None | Token only | Separate configs | Shared config |
| **Network Calls** | None | None | Auth ↔ API | None |
| **Scaling** | Basic | Basic | Excellent | Good |
| **Security** | Public | Medium | High | High |
| **Use Case** | Development | Internal APIs | Production | Small/Medium |

## 🔐 **Security Considerations**

### **No Auth Mode**
- Only use for public data
- Consider rate limiting
- Monitor for abuse

### **Bearer Token Mode**
- Use strong, randomly generated tokens
- Store tokens securely (environment variables)
- Rotate tokens regularly
- Use HTTPS in production
- Monitor for token leaks

### **External OAuth Mode**
- Use HTTPS in production
- Secure secret sharing between services
- Monitor auth server performance
- Implement proper logging

### **Integrated OAuth Mode**
- Use HTTPS in production
- Store secrets securely
- Monitor server resources
- Implement proper session management

## 🎯 **Best Practices**

1. **Start Simple:** Begin with no auth for development
2. **Add Basic Security:** Use bearer token for internal APIs
3. **Add Full Security:** Move to integrated OAuth for MVPs
4. **Scale Up:** Use external OAuth for production systems
5. **Monitor Everything:** Add logging and metrics
6. **Secure Secrets:** Use environment variables and secret management

## 📚 **Next Steps**

- Check out `auth-integration-examples.md` for real-world integrations
- Review the OAuth 2.1 specification for compliance
- Test with MCP Inspector for debugging
- Implement proper error handling and logging 