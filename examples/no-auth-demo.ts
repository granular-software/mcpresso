import { z } from "zod";
import { createMCPServer, createResource } from "../src/index.js";

// Sample data (no auth required)
const publicUsers = [
	{
		id: "user-1",
		username: "public_user",
		email: "public@example.com",
		role: "guest",
	},
	{
		id: "user-2", 
		username: "demo_user",
		email: "demo@example.com",
		role: "demo",
	},
];

const UserSchema = z.object({
	id: z.string(),
	username: z.string(),
	email: z.string(),
	role: z.string(),
});

const userResource = createResource({
	name: "user",
	schema: UserSchema,
	uri_template: "users/{id}",
	methods: {
		get: {
			description: "Get a user by ID (no auth required)",
			handler: async ({ id }) => {
				// Note: no user parameter since there's no auth
				const userData = publicUsers.find((u) => u.id === id);
				if (!userData) {
					throw new Error(`User ${id} not found`);
				}

				return userData;
			},
		},

		list: {
			description: "List all users (public endpoint)",
			handler: async () => {
				// Public endpoint - anyone can access
				return publicUsers;
			},
		},

		status: {
			description: "Get server status",
			inputSchema: z.object({}),
			outputSchema: z.object({
				status: z.string(),
				message: z.string(),
				timestamp: z.string(),
				authMode: z.string(),
				publicEndpoints: z.array(z.string()),
			}),
			handler: async () => {
				return {
					status: "online",
					message: "MCP server running without authentication",
					timestamp: new Date().toISOString(),
					authMode: "none",
					publicEndpoints: [
						"GET /users/{id}",
						"POST /users/list", 
						"POST /users/status"
					],
				};
			},
		},
	},
});

// Create MCP server with NO authentication
const app = createMCPServer({
	name: "no_auth_demo_server",
	resources: [userResource],
	// No auth field = no authentication required
});

app.listen(4000, () => {
	console.log("🚀 No-Auth MCP Server started!");
	console.log("");
	console.log("📊 Server Details:");
	console.log("  • MCP Server: http://localhost:4000");
	console.log("  • Authentication: DISABLED");
	console.log("  • All endpoints are PUBLIC");
	console.log("");
	console.log("📡 Available Resources:");
	console.log("  • GET users/{id} - Get user by ID");
	console.log("  • POST users/list - List all users");
	console.log("  • POST users/status - Get server status");
	console.log("");
	console.log("🧪 Test Commands:");
	console.log("  curl http://localhost:4000 \\");
	console.log("    -H 'Content-Type: application/json' \\");
	console.log("    -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_users\",\"arguments\":{}}}'");
	console.log("");
	console.log("✅ Benefits of No-Auth Mode:");
	console.log("  • Simplest possible setup");
	console.log("  • No token management required");
	console.log("  • Perfect for public APIs");
	console.log("  • Great for development/testing");
	console.log("");
	console.log("⚠️  Security Note:");
	console.log("  • All data is publicly accessible");
	console.log("  • Use only for non-sensitive data");
	console.log("  • Consider rate limiting for production");
}); 