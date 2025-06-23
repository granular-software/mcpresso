import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// This example demonstrates the rate limiting functionality.
// The server is configured to allow only a small number of requests
// per minute.

console.log("Starting rate limiting example server...");

// 1. Define a schema for a simple ping response
const PingSchema = z.object({
	message: z.string(),
	timestamp: z.date(),
});

// 2. Create a simple resource
const pingResource = createResource({
	name: "ping",
	schema: PingSchema,
	uri_template: "ping",
	methods: {
		get: {
			description: "A simple endpoint to test server availability.",
			handler: async () => {
				console.log("-> Ping handler executed.");
				return {
					message: "pong",
					timestamp: new Date(),
				};
			},
		},
	},
});

// 3. Create the MCP server with a strict rate limit configuration
const server = createMCPServer({
	name: "rate_limit_server",
	resources: [pingResource],
	// Configure rate limiting to prevent abuse
	rateLimit: {
		windowMs: 60 * 1000, // 1 minute
		limit: 5, // Limit each IP to 5 requests per minute
		standardHeaders: "draft-7",
		legacyHeaders: false,
	},
});

// 4. Start the server
server.listen(3082, () => {
	console.log("MCPresso rate limit example server running on http://localhost:3082");
	console.log("Call the 'get_ping' tool more than 5 times within a minute to trigger the rate limiter.");
});
