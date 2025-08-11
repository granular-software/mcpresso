import { z } from "zod";
import { createResource, createMCPServer, type MCPServerConfig } from "../src/index.js";
import request from "supertest";
import type { Express } from "express";

// Test data schemas
const UserSchema = z.object({
  id: z.string().readonly(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date().readonly(),
  updatedAt: z.date().readonly(),
});

const PostSchema = z.object({
  id: z.string().readonly(),
  title: z.string(),
  content: z.string(),
  authorId: z.string().readonly(),
  publishedAt: z.date().optional(),
  viewCount: z.number().readonly(),
  likeCount: z.number().readonly(),
  createdAt: z.date().readonly(),
  updatedAt: z.date().readonly(),
});

// In-memory data stores for testing
const users: z.infer<typeof UserSchema>[] = [];
const posts: z.infer<typeof PostSchema>[] = [];

// Helper function to create a test server
function createTestServer(config: Partial<MCPServerConfig> = {}): Express {
  const userResource = createResource({
    name: "user",
    schema: UserSchema,
    uri_template: "users/{id}",
    methods: {
      get: {
        handler: async ({ id }) => {
          return users.find((user) => user.id === id);
        },
      },
      create: {
        handler: async (data) => {
          const newUser = {
            id: `user-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.push(newUser);
          return newUser;
        },
      },
      update: {
        handler: async ({ id, ...data }) => {
          const index = users.findIndex((user) => user.id === id);
          if (index === -1) return null as any;
          users[index] = { ...users[index], ...data, updatedAt: new Date() };
          return users[index];
        },
      },
      delete: {
        handler: async ({ id }) => {
          const index = users.findIndex((user) => user.id === id);
          if (index === -1) return { success: false };
          users.splice(index, 1);
          return { success: true };
        },
      },
      list: {
        handler: async () => users,
      },
      search: {
        description: "Search users by name or email",
        inputSchema: z.object({
          query: z.string().describe("Search text in name or email"),
        }),
        handler: async ({ query }) => {
          return users.filter(
            (user) =>
              user.name.toLowerCase().includes(query.toLowerCase()) ||
              user.email.toLowerCase().includes(query.toLowerCase())
          );
        },
      },
    },
  });

  const postResource = createResource({
    name: "post",
    schema: PostSchema,
    uri_template: "posts/{id}",
    methods: {
      get: {
        handler: async ({ id }) => {
          return posts.find((post) => post.id === id);
        },
      },
      create: {
        handler: async (data) => {
          const newPost = {
            id: `post-${Date.now()}`,
            ...data,
            viewCount: 0,
            likeCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          posts.push(newPost);
          return newPost;
        },
      },
      update: {
        handler: async ({ id, ...data }) => {
          const index = posts.findIndex((post) => post.id === id);
          if (index === -1) return null as any;
          posts[index] = { ...posts[index], ...data, updatedAt: new Date() };
          return posts[index];
        },
      },
      delete: {
        handler: async ({ id }) => {
          const index = posts.findIndex((post) => post.id === id);
          if (index === -1) return { success: false };
          posts.splice(index, 1);
          return { success: true };
        },
      },
      list: {
        handler: async () => posts,
      },
      count_by_author: {
        description: "Count posts by author",
        inputSchema: z.object({
          authorId: z.string().describe("Author ID to count posts for"),
        }),
        outputSchema: z.object({
          count: z.number(),
        }),
        handler: async ({ authorId }) => {
          const count = posts.filter((post) => post.authorId === authorId).length;
          return { count };
        },
      },
    },
  });

  return createMCPServer({
    name: "test_server",
    serverUrl: "http://localhost:3000",
    resources: [userResource, postResource],
    exposeTypes: true,
    serverMetadata: {
      name: "Test MCPresso Server",
      version: "1.0.0",
      description: "A test server for end-to-end testing",
      url: "http://localhost:3000",
      contact: {
        name: "Test Team",
        email: "test@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
      capabilities: {
        authentication: false,
        rateLimiting: false,
        retries: false,
        streaming: true,
      },
    },
    ...config,
  });
}

describe("MCPresso End-to-End Tests", () => {
  let server: Express;
  let serverInstance: any;

  // Jest lifecycle hooks
  beforeEach(() => {
    // Clear test data
    users.length = 0;
    posts.length = 0;
  });

  afterEach(() => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  describe("Basic CRUD Operations", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0); // Use random port
    });

    it("should create, read, update, and delete users", async () => {
      // Create a user
      const createResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "create_user",
            arguments: {
              name: "John Doe",
              email: "john@example.com",
            },
          },
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.result.content[0].text).toContain("user-");
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("John Doe");
      expect(users[0].email).toBe("john@example.com");

      const userId = users[0].id;

      // Read the user
      const getResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "get_user",
            arguments: { id: userId },
          },
        });

      expect(getResponse.status).toBe(200);
      const userData = JSON.parse(getResponse.body.result.content[0].text);
      expect(userData.name).toBe("John Doe");

      // Update the user
      const updateResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "update_user",
            arguments: {
              id: userId,
              name: "John Smith",
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(users[0].name).toBe("John Smith");

      // List users
      const listResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "list_user",
            arguments: {},
          },
        });

      expect(listResponse.status).toBe(200);
      expect(users).toHaveLength(1);

      // Delete the user
      const deleteResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "delete_user",
            arguments: { id: userId },
          },
        });

      expect(deleteResponse.status).toBe(200);
      expect(users).toHaveLength(0);
    });

    it("should handle non-existent resources gracefully", async () => {
      // Try to get non-existent user
      const getResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_user",
            arguments: { id: "non-existent" },
          },
        });

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.result.content[0].text).toBe("null");

      // Try to delete non-existent user
      const deleteResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "delete_user",
            arguments: { id: "non-existent" },
          },
        });

      expect(deleteResponse.status).toBe(200);
      const result = JSON.parse(deleteResponse.body.result.content[0].text);
      expect(result.success).toBe(false);
    });
  });

  describe("Readonly Fields", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should exclude readonly fields from create operations", async () => {
      // Create a user with readonly fields (should be ignored)
      const createResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "create_user",
            arguments: {
              id: "custom-id", // Should be ignored
              name: "John Doe",
              email: "john@example.com",
              createdAt: new Date("2020-01-01"), // Should be ignored
            },
          },
        });

      expect(createResponse.status).toBe(200);
      expect(users).toHaveLength(1);
      expect(users[0].id).not.toBe("custom-id"); // Should be auto-generated
      expect(users[0].createdAt).not.toEqual(new Date("2020-01-01")); // Should be current time
      expect(users[0].name).toBe("John Doe"); // Should be preserved
    });

    it("should exclude readonly fields from update operations", async () => {
      // Create a user first
      const createResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "create_user",
            arguments: {
              name: "John Doe",
              email: "john@example.com",
            },
          },
        });

      const userId = users[0].id;
      const originalCreatedAt = users[0].createdAt;

      // Try to update readonly fields (should be ignored)
      const updateResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "update_user",
            arguments: {
              id: userId,
              name: "John Smith", // Should be updated
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(users[0].id).toBe(userId); // Should remain unchanged
      expect(users[0].createdAt).toEqual(originalCreatedAt); // Should remain unchanged
      expect(users[0].name).toBe("John Smith"); // Should be updated
    });
  });

  describe("Custom Methods", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should handle custom search methods", async () => {
      // Create test users
      users.push(
        {
          id: "user-1",
          name: "John Doe",
          email: "john@example.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "user-2",
          name: "Jane Smith",
          email: "jane@example.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Search by name
      const searchResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "search_user",
            arguments: { query: "John" },
          },
        });

      expect(searchResponse.status).toBe(200);
      const results = JSON.parse(searchResponse.body.result.content[0].text);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("John Doe");

      // Search by email
      const emailSearchResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "search_user",
            arguments: { query: "jane" },
          },
        });

      expect(emailSearchResponse.status).toBe(200);
      const emailResults = JSON.parse(emailSearchResponse.body.result.content[0].text);
      expect(emailResults).toHaveLength(1);
      expect(emailResults[0].email).toBe("jane@example.com");
    });

    it("should handle custom domain methods", async () => {
      // Create test posts
      posts.push(
        {
          id: "post-1",
          title: "First Post",
          content: "Content 1",
          authorId: "user-1",
          viewCount: 10,
          likeCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "post-2",
          title: "Second Post",
          content: "Content 2",
          authorId: "user-1",
          viewCount: 20,
          likeCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "post-3",
          title: "Third Post",
          content: "Content 3",
          authorId: "user-2",
          viewCount: 5,
          likeCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );

      // Count posts by author
      const countResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "count_by_author_post",
            arguments: { authorId: "user-1" },
          },
        });

      expect(countResponse.status).toBe(200);
      const result = JSON.parse(countResponse.body.result.content[0].text);
      expect(result.count).toBe(2);
    });
  });

  describe("Type Exposure", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should expose resource types as MCP resources", async () => {
      // Get the list of available types
      const listTypesResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "resources/list",
          params: {},
        });

      expect(listTypesResponse.status).toBe(200);
      const resources = listTypesResponse.body.result.resources;
      
      // Should include type resources
      const typeResources = resources.filter((r: any) => r.uri.startsWith("type://"));
      expect(typeResources.length).toBeGreaterThan(0);
      
      // Should include user and post types
      const userType = typeResources.find((r: any) => r.uri.includes("/user"));
      const postType = typeResources.find((r: any) => r.uri.includes("/post"));
      
      expect(userType).toBeDefined();
      expect(postType).toBeDefined();
    });

    it("should provide JSON schemas for exposed types", async () => {
      // Read a specific type resource
      const readTypeResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "resources/read",
          params: {
            uri: "type://test_server/user",
          },
        });

      expect(readTypeResponse.status).toBe(200);
      const typeData = JSON.parse(readTypeResponse.body.result.contents[0].text);
      
      expect(typeData.name).toBe("user");
      expect(typeData.fields).toBeDefined();
      expect(typeData.related_tools).toBeDefined();
      
      // Check that readonly fields are properly marked
      const idField = typeData.fields.find((f: any) => f.name === "id");
      const nameField = typeData.fields.find((f: any) => f.name === "name");
      
      expect(idField).toBeDefined();
      expect(nameField).toBeDefined();
    });
  });

  describe("Server Metadata", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should expose server metadata as a resource", async () => {
      // Read server metadata
      const readMetadataResponse = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "resources/read",
          params: {
            uri: "metadata://test_server/server",
          },
        });

      expect(readMetadataResponse.status).toBe(200);
      const metadata = JSON.parse(readMetadataResponse.body.result.contents[0].text);
      
      expect(metadata.name).toBe("Test MCPresso Server");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.description).toBe("A test server for end-to-end testing");
      expect(metadata.capabilities).toBeDefined();
      expect(metadata.resources).toBeDefined();
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      server = createTestServer({
        rateLimit: {
          windowMs: 1000, // 1 second window
          limit: 2, // Only 2 requests per window
        },
      });
      serverInstance = server.listen(0);
    });

    it("should enforce rate limits", async () => {
      // Make 3 requests rapidly
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(server)
            .post("/")
          .set("Accept", "application/json, text/event-stream")
            .send({
              jsonrpc: "2.0",
              id: i + 1,
              method: "tools/call",
              params: {
                name: "list_user",
                arguments: {},
              },
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // First two should succeed
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      
      // Third should be rate limited
      expect(responses[2].status).toBe(429);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should handle invalid JSON-RPC requests", async () => {
      const response = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "invalid_method",
          params: {},
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(-32601); // Method not found
    });

    it("should handle validation errors", async () => {
      const response = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "create_user",
            arguments: {
              name: "John Doe",
              email: "invalid-email", // Invalid email format
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(-32602); // Invalid params
    });
  });

  describe("HTTP Method Handling", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should accept GET requests to MCP endpoint for SSE", async () => {
      const response = await request(server)
        .get("/")
        .set("Accept", "text/event-stream");
      
      // GET requests with proper Accept header should be accepted
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");
    });

    it("should reject GET requests without proper Accept header", async () => {
      const response = await request(server).get("/");
      expect(response.status).toBe(406); // Not Acceptable
    });

    it("should accept DELETE requests to MCP endpoint", async () => {
      const response = await request(server).delete("/");
      expect(response.status).toBe(200);
    });

    it("should accept POST requests to MCP endpoint", async () => {
      const response = await request(server)
        .post("/")
          .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        });

      expect(response.status).toBe(200);
    });

    it("should reject unsupported HTTP methods", async () => {
      const response = await request(server).put("/");
      expect(response.status).toBe(405);
      expect(response.body.message).toContain("Only POST, GET, and DELETE requests are allowed");
    });
  });

  describe("CORS Support", () => {
    beforeEach(() => {
      server = createTestServer();
      serverInstance = server.listen(0);
    });

    it("should handle CORS preflight requests", async () => {
      const response = await request(server)
        .options("/")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type, mcp-session-id, accept, last-event-id");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });
  });
}); 