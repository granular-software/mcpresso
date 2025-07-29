import { createMCPServer, createResource } from "../src/index";
import { z } from "zod";

// Example resource that requires authentication
const userResource = createResource({
  name: "user",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    created_at: z.string().optional()
  }),
  uri_template: "users/{id}",
  methods: {
    list: {
      description: "List all users",
      inputSchema: z.object({
        limit: z.number().default(10).describe("Maximum number of users to return"),
        offset: z.number().default(0).describe("Number of users to skip")
      }),
      handler: async (params, user) => {
        console.log("🔐 Authenticated user:", user);
        
        // Mock user data
        const users = [
          { id: "1", name: "John Doe", email: "john@example.com" },
          { id: "2", name: "Jane Smith", email: "jane@example.com" },
          { id: "3", name: "Bob Johnson", email: "bob@example.com" }
        ];
        
        const limit = params.limit || 10;
        const offset = params.offset || 0;
        
        return {
          users: users.slice(offset, offset + limit),
          total: users.length
        };
      }
    },
    get: {
      description: "Get a specific user by ID",
      inputSchema: z.object({
        id: z.string().describe("User ID")
      }),
      handler: async (params, user) => {
        console.log("🔐 Authenticated user:", user);
        
        // Mock user lookup
        const users = {
          "1": { id: "1", name: "John Doe", email: "john@example.com", created_at: "2024-01-01T00:00:00Z" },
          "2": { id: "2", name: "Jane Smith", email: "jane@example.com", created_at: "2024-01-02T00:00:00Z" },
          "3": { id: "3", name: "Bob Johnson", email: "bob@example.com", created_at: "2024-01-03T00:00:00Z" }
        };
        
        const foundUser = users[params.id];
        if (!foundUser) {
          throw new Error(`User with ID ${params.id} not found`);
        }
        
        return foundUser;
      }
    }
  }
});

// Create MCP server with Bearer token authentication
const app = createMCPServer({
  name: "bearer_token_demo",
  description: "Demo server with Bearer token authentication",
  serverUrl: "http://localhost:4001",
  resources: [userResource],
  auth: {
    bearerToken: {
      // Optional: Custom header name (defaults to "Authorization")
      headerName: "Authorization",
      
      // The secret token that clients must provide
      token: "sk-1234567890abcdef",
      
      // Optional: Custom user profile
      userProfile: {
        id: "api-client",
        username: "demo-client",
        email: "client@example.com",
        scopes: ["read", "write", "admin"]
      }
    }
  }
});

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`🚀 Bearer Token Demo Server running on http://localhost:${port}`);
  console.log(`🔐 Authentication: Bearer token required`);
  console.log(`🔑 Token: sk-1234567890abcdef`);
  console.log(`📝 Example request:`);
  console.log(`   curl -H "Authorization: Bearer sk-1234567890abcdef" http://localhost:${port}/`);
  console.log(`\n📚 Available endpoints:`);
  console.log(`   GET  / - MCP server info`);
  console.log(`   GET  /.well-known/oauth-protected-resource-metadata - Auth metadata`);
}); 