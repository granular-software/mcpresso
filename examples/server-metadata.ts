import { z } from "zod";
import { createResource, createMCPServer, ServerMetadata } from "../src/index.js";

// This example demonstrates the server metadata feature.
// The server exposes its own metadata as an MCP resource.

console.log("Starting server metadata example...");

// 1. Define schemas for our resources
const UserSchema = z.object({
	id: z.string().readonly(),
	name: z.string(),
	email: z.string().email(),
	createdAt: z.date().readonly(),
});

const PostSchema = z.object({
	id: z.string().readonly(),
	title: z.string(),
	content: z.string(),
	authorId: z.string(),
	publishedAt: z.date().optional(),
	viewCount: z.number().readonly(),
	likeCount: z.number().readonly(),
});

// 2. Create resources
const userResource = createResource({
	name: "user",
	schema: UserSchema,
	uri_template: "users/{id}",
	methods: {
		get: {
			description: "Retrieve a user by ID",
			handler: async ({ id }) => {
				console.log(`-> Getting user: ${id}`);
				return {
					id: id,
					name: "John Doe",
					email: "john@example.com",
					createdAt: new Date("2024-01-01"),
				};
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
			description: "Retrieve a post by ID",
			handler: async ({ id }) => {
				console.log(`-> Getting post: ${id}`);
				return {
					id: id,
					title: "Sample Post",
					content: "This is a sample post content.",
					authorId: "user-123",
					publishedAt: new Date("2024-01-15"),
					viewCount: 42,
					likeCount: 7,
				};
			},
		},
	},
});

// 3. Define comprehensive server metadata
const serverMetadata: ServerMetadata = {
	name: "Blog API Server",
	version: "1.0.0",
	description: "A comprehensive blog API server with user and post management",
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
};

// 4. Create the MCP server with metadata
const server = createMCPServer({
	name: "blog_api_server",
	resources: [userResource, postResource],
	serverMetadata,
	// Enable type exposure for better documentation
	exposeTypes: true,
	// Add some rate limiting
	rateLimit: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		limit: 100, // limit each IP to 100 requests per windowMs
		standardHeaders: "draft-7",
		legacyHeaders: false,
	},
});

// 5. Start the server
server.listen(3083, () => {
	console.log("MCPresso server metadata example running on http://localhost:3083");
	console.log("");
	console.log("📋 Available MCP Resources:");
	console.log("  • user - User management");
	console.log("  • post - Post management");
	console.log("  • server_metadata - Server information and capabilities");
	console.log("  • user_types - User schema documentation");
	console.log("  • post_types - Post schema documentation");
	console.log("");
	console.log("🔍 Try reading the server metadata:");
	console.log("  MCP Client: read_resource('server_metadata', 'metadata://blog_api_server/server')");
	console.log("");
	console.log("📖 Try reading the type schemas:");
	console.log("  MCP Client: read_resource('user_types', 'schema://blog_api_server/user')");
	console.log("  MCP Client: read_resource('post_types', 'schema://blog_api_server/post')");
}); 