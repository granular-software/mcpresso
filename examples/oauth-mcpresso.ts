/**
 * Example: MCPresso + OAuth 2.1 Authentication
 *
 * This example demonstrates how to secure your MCPresso server with OAuth 2.1 in just a few lines.
 *
 * - All endpoints are protected: only requests with a valid Bearer token are allowed.
 * - The authenticated user (JWT payload) is available as `args.user` in all handlers.
 * - Shows a protected resource and a tool that returns the authenticated user info.
 *
 * To run:
 *   1. Start an MCP OAuth 2.1 server (see mcpresso-oauth-server package).
 *   2. Replace the `issuer` URL below with your auth server's URL.
 *   3. Run this example: `bun run packages/mcpresso/examples/oauth-mcpresso.ts`
 *   4. Make requests with a valid Bearer token in the Authorization header.
 */

import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define a simple user schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type User = z.infer<typeof UserSchema>;

type AuthPayload = {
  sub: string;
  [key: string]: unknown;
};

// In-memory user data
const users: User[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

// Protected resource: user
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    get: {
      /**
       * Returns the user by id, only if authenticated.
       * The authenticated user info is available as the second parameter.
       */
      handler: async ({ id }, user?: AuthPayload) => {
        // You can use user.sub, user.email, etc. from the JWT
        console.log("Authenticated user:", user);
        return users.find((u) => u.id === id);
      },
    },
    /**
     * Returns the authenticated user info (from the JWT).
     */
    whoami: {
      description: "Returns the authenticated user info (JWT payload)",
      inputSchema: z.object({}),
      outputSchema: z.unknown(),
      handler: async (_, user?: AuthPayload) => {
        return user;
      },
    },
  },
});

// Create the MCPresso server with OAuth 2.1 authentication
const server = createMCPServer({
  name: "oauth_example_server",
  resources: [userResource],
  auth: {
    // Basic configuration (minimum required)
    issuer: "http://localhost:3000", // <-- Replace with your OAuth server URL
    
    // Optional: Your server's URL (used as audience validation)
    serverUrl: "http://localhost:3081",
    
    // Optional: Custom error messages for better UX
    errorHandling: {
      messages: {
        missingToken: "Please provide a valid authentication token",
        invalidToken: "Your authentication token is invalid",
        expiredToken: "Your authentication token has expired",
        audienceMismatch: "This token is not valid for this service",
      }
    },
    
    // Optional: Logging configuration
    logging: {
      logSuccess: true, // Log successful authentications
      logFailures: true, // Log failed authentications
      logValidation: false, // Don't log validation details
    },
  },
  exposeTypes: true,
});

server.listen(3081, () => {
  console.log("MCPresso OAuth example running on http://localhost:3081");
  console.log("All endpoints require a valid Bearer token.");
  console.log("Try: curl -H 'Authorization: Bearer <token>' http://localhost:3081/");
}); 