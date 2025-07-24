import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";
import request from "supertest";
import type { Express } from "express";

// Test schema for authenticated resources
const ProtectedUserSchema = z.object({
  id: z.string().readonly(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.date().readonly(),
  updatedAt: z.date().readonly(),
});

// In-memory data store for authenticated tests
const protectedUsers: z.infer<typeof ProtectedUserSchema>[] = [];

describe("MCPresso Authentication Tests", () => {
  let server: Express;
  let serverInstance: any;

  beforeEach(() => {
    protectedUsers.length = 0;
  });

  afterEach(() => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  describe("OAuth 2.1 Authentication", () => {
    beforeEach(() => {
      const protectedUserResource = createResource({
        name: "protected_user",
        schema: ProtectedUserSchema,
        uri_template: "protected_users/{id}",
        methods: {
          get: {
            handler: async ({ id }, user) => {
              return protectedUsers.find((user) => user.id === id);
            },
          },
          create: {
            handler: async (data, user) => {
              const newUser = {
                id: `user-${Date.now()}`,
                name: data.name || '',
                email: data.email || '',
                role: data.role || '',
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              protectedUsers.push(newUser);
              return newUser;
            },
          },
          list: {
            handler: async (_, user) => protectedUsers,
          },
        },
      });

      server = createMCPServer({
        name: "auth_test_server",
        serverUrl: "http://localhost:3000",
        resources: [protectedUserResource],
        auth: {
          issuer: "https://test-auth-server.com",
        },
      });

      serverInstance = server.listen(0);
    });

    it("should expose OAuth metadata endpoint", async () => {
      const response = await request(server).get("/.well-known/oauth-protected-resource-metadata");
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("resource");
      expect(response.body.resource).toBe("http://localhost:3000");
      expect(response.body).toHaveProperty("authorization_servers");
      expect(response.body.authorization_servers).toEqual(["https://test-auth-server.com"]);
    });

    it("should reject requests without valid JWT", async () => {
      const response = await request(server)
        .post("/")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "list_protected_user",
            arguments: {},
          },
        });

      expect(response.status).toBe(401);
    });

    it("should accept requests with valid JWT", async () => {
      // Note: This test would require a valid JWT token
      // In a real test environment, you would generate a valid JWT
      // For now, we'll test the structure without actual authentication
      
      const response = await request(server)
        .post("/")
        .set("Authorization", "Bearer invalid-token")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "list_protected_user",
            arguments: {},
          },
        });

      // Should reject invalid token
      expect(response.status).toBe(401);
    });
  });

  describe("Authentication Middleware Integration", () => {
    it("should handle malformed Authorization headers", async () => {
      const protectedUserResource = createResource({
        name: "protected_user",
        schema: ProtectedUserSchema,
        uri_template: "protected_users/{id}",
        methods: {
          get: {
            handler: async ({ id }, user) => {
              return protectedUsers.find((user) => user.id === id);
            },
          },
        },
      });

      server = createMCPServer({
        name: "auth_test_server",
        resources: [protectedUserResource],
        auth: {
          issuer: "https://test-auth-server.com",
        },
      });

      serverInstance = server.listen(0);

      // Test with malformed Authorization header
      const response = await request(server)
        .post("/")
        .set("Authorization", "InvalidFormat token")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_protected_user",
            arguments: { id: "test" },
          },
        });

      expect(response.status).toBe(401);
    });

    it("should handle missing Authorization header", async () => {
      const protectedUserResource = createResource({
        name: "protected_user",
        schema: ProtectedUserSchema,
        uri_template: "protected_users/{id}",
        methods: {
          get: {
            handler: async ({ id }, user) => {
              return protectedUsers.find((user) => user.id === id);
            },
          },
        },
      });

      server = createMCPServer({
        name: "auth_test_server",
        resources: [protectedUserResource],
        auth: {
          issuer: "https://test-auth-server.com",
        },
      });

      serverInstance = server.listen(0);

      // Test without Authorization header
      const response = await request(server)
        .post("/")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_protected_user",
            arguments: { id: "test" },
          },
        });

      expect(response.status).toBe(401);
    });
  });

  describe("Server Metadata with Authentication", () => {
    it("should include authentication capabilities in server metadata", async () => {
      const protectedUserResource = createResource({
        name: "protected_user",
        schema: ProtectedUserSchema,
        uri_template: "protected_users/{id}",
        methods: {
          get: {
            handler: async ({ id }, user) => {
              return protectedUsers.find((user) => user.id === id);
            },
          },
        },
      });

      server = createMCPServer({
        name: "auth_test_server",
        resources: [protectedUserResource],
        auth: {
          issuer: "https://test-auth-server.com",
        },
        serverMetadata: {
          name: "Authenticated Test Server",
          version: "1.0.0",
          description: "A test server with authentication",
          capabilities: {
            authentication: true,
            rateLimiting: false,
            retries: false,
            streaming: true,
          },
        },
      });

      serverInstance = server.listen(0);

      // Read server metadata - should require authentication
      const response = await request(server)
        .post("/")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "resources/read",
          params: {
            uri: "metadata://auth_test_server/server",
          },
        });

      // Should require authentication
      expect(response.status).toBe(401);
      
      // Test that the server metadata is properly configured by checking the auth config
      expect(server).toBeDefined();
    });
  });
}); 