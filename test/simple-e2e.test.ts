import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";
import request from "supertest";
import type { Express } from "express";

// Simple test schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
});

// In-memory data stores
const users: z.infer<typeof UserSchema>[] = [];
const posts: z.infer<typeof PostSchema>[] = [];

// Helper function to create a simple test server
function createSimpleTestServer(): Express {
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
          };
          users.push(newUser);
          return newUser;
        },
      },
      update: {
        handler: async ({ id, ...data }) => {
          const index = users.findIndex((user) => user.id === id);
          if (index === -1) return null as any;
          users[index] = { ...users[index], ...data };
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
          };
          posts.push(newPost);
          return newPost;
        },
      },
      list: {
        handler: async () => posts,
      },
    },
  });

  return createMCPServer({
    name: "test_server",
    resources: [userResource, postResource],
    exposeTypes: true,
  });
}

describe("MCPresso Simple End-to-End Tests", () => {
  let server: Express;
  let serverInstance: any;

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
      server = createSimpleTestServer();
      serverInstance = server.listen(0);
    });

    it("should create and read users", async () => {
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
      const createdUser = JSON.parse(createResponse.body.result.content[0].text);
      expect(createdUser.name).toBe("John Doe");
      expect(createdUser.email).toBe("john@example.com");

      // Read the user
      const getResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_user",
            arguments: { id: createdUser.id },
          },
        });

      expect(getResponse.status).toBe(200);
      const retrievedUser = JSON.parse(getResponse.body.result.content[0].text);
      expect(retrievedUser.name).toBe("John Doe");
      expect(retrievedUser.email).toBe("john@example.com");

      // List users
      const listResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "list_users",
            arguments: {},
          },
        });

      expect(listResponse.status).toBe(200);
      const userList = JSON.parse(listResponse.body.result.content[0].text);
      expect(userList).toHaveLength(1);
      expect(userList[0].name).toBe("John Doe");

      // Update the user
      const updateResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "update_user",
            arguments: {
              id: createdUser.id,
              name: "John Smith",
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      const updatedUser = JSON.parse(updateResponse.body.result.content[0].text);
      expect(updatedUser.name).toBe("John Smith");

      // Delete the user
      const deleteResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "delete_user",
            arguments: { id: createdUser.id },
          },
        });

      expect(deleteResponse.status).toBe(200);
      const deleteResult = JSON.parse(deleteResponse.body.result.content[0].text);
      expect(deleteResult.success).toBe(true);
    });

    it("should list users", async () => {
      // Add some test users
      users.push(
        { id: "user-1", name: "John Doe", email: "john@example.com" },
        { id: "user-2", name: "Jane Smith", email: "jane@example.com" }
      );

      const listResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "list_users",
            arguments: {},
          },
        });

      expect(listResponse.status).toBe(200);
      const userList = JSON.parse(listResponse.body.result.content[0].text);
      expect(userList).toHaveLength(2);
      expect(userList[0].name).toBe("John Doe");
      expect(userList[1].name).toBe("Jane Smith");
    });

    it("should update users", async () => {
      // Create a user first
      users.push({ id: "user-1", name: "John Doe", email: "john@example.com" });

      const updateResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "update_user",
            arguments: {
              id: "user-1",
              name: "John Smith",
            },
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(users[0].name).toBe("John Smith");
    });

    it("should delete users", async () => {
      // Create a user first
      users.push({ id: "user-1", name: "John Doe", email: "john@example.com" });

      const deleteResponse = await request(server)
        .post("/")
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "delete_user",
            arguments: { id: "user-1" },
          },
        });

      expect(deleteResponse.status).toBe(200);
      const result = JSON.parse(deleteResponse.body.result.content[0].text);
      expect(result.success).toBe(true);
      expect(users).toHaveLength(0);
    });
  });

  describe("Type Exposure", () => {
    beforeEach(() => {
      server = createSimpleTestServer();
      serverInstance = server.listen(0);
    });

    it("should expose resource types", async () => {
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

    it("should provide JSON schemas for types", async () => {
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
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      server = createSimpleTestServer();
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
      server = createSimpleTestServer();
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
      server = createSimpleTestServer();
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