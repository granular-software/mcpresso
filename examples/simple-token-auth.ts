import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define schemas
const NoteSchema = z.object({
	id: z.string(),
	title: z.string(),
	content: z.string(),
	authorId: z.string(),
	createdAt: z.date(),
});

const UserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
});

// Sample data
const notes: z.infer<typeof NoteSchema>[] = [
	{
		id: "1",
		title: "Private Note",
		content: "This note requires authentication to access.",
		authorId: "1",
		createdAt: new Date("2024-01-01"),
	},
	{
		id: "2", 
		title: "Secure Content",
		content: "This content is protected by bearer token authentication.",
		authorId: "2",
		createdAt: new Date("2024-01-02"),
	},
];

const users: z.infer<typeof UserSchema>[] = [
	{ id: "1", name: "Alice", email: "alice@example.com" },
	{ id: "2", name: "Bob", email: "bob@example.com" },
];

// Create note resource
const noteResource = createResource({
	name: "note",
	schema: NoteSchema,
	uri_template: "notes/{id}",
	methods: {
		get: {
			description: "Get a note by ID (requires authentication)",
			handler: async ({ id }, user) => {
				console.log(`Getting note ${id} for authenticated user:`, user);
				return notes.find((note) => note.id === id);
			},
		},
		list: {
			description: "List all notes (requires authentication)",
			handler: async (_, user) => {
				console.log("Listing all notes for authenticated user:", user);
				return notes;
			},
		},
		create: {
			description: "Create a new note (requires authentication)",
			handler: async (data, user) => {
				console.log("Creating note for authenticated user:", user, "Data:", data);
				
				const newNote = {
					id: (notes.length + 1).toString(),
					title: data.title || "Untitled",
					content: data.content || "",
					authorId: user?.id || "unknown",
					createdAt: new Date(),
				};
				
				notes.push(newNote);
				return newNote;
			},
		},
		delete: {
			description: "Delete a note (requires authentication)",
			handler: async ({ id }, user) => {
				console.log(`Deleting note ${id} for authenticated user:`, user);
				
				const index = notes.findIndex((note) => note.id === id);
				if (index === -1) {
					return { success: false };
				}
				
				notes.splice(index, 1);
				return { success: true };
			},
		},
		search: {
			description: "Search notes by content (requires authentication)",
			inputSchema: z.object({
				query: z.string().describe("Search query"),
			}),
			handler: async ({ query }, user) => {
				console.log(`Searching notes for "${query}" by authenticated user:`, user);
				return notes.filter((note) => 
					note.content.toLowerCase().includes(query.toLowerCase()) ||
					note.title.toLowerCase().includes(query.toLowerCase())
				);
			},
		},
	},
});

// Create user resource
const userResource = createResource({
	name: "user",
	schema: UserSchema,
	uri_template: "users/{id}",
	methods: {
		get: {
			description: "Get a user by ID (requires authentication)",
			handler: async ({ id }, user) => {
				console.log(`Getting user ${id} for authenticated user:`, user);
				return users.find((user) => user.id === id);
			},
		},
		list: {
			description: "List all users (requires authentication)",
			handler: async (_, user) => {
				console.log("Listing all users for authenticated user:", user);
				return users;
			},
		},
		profile: {
			description: "Get current user profile (requires authentication)",
			inputSchema: z.object({}),
			outputSchema: z.object({
				id: z.string(),
				username: z.string(),
				email: z.string(),
				scopes: z.array(z.string()),
			}),
			handler: async (_, user) => {
				console.log("Getting profile for authenticated user:", user);
				return {
					id: user?.id || "unknown",
					username: user?.username || "unknown",
					email: user?.email || "unknown@example.com",
					scopes: user?.scopes || ["read"],
				};
			},
		},
	},
});

// Create MCP server with Bearer token authentication
const server = createMCPServer({
	name: "simple_token_auth_server",
	serverUrl: "http://localhost:3001",
	resources: [noteResource, userResource],
	exposeTypes: true,
	auth: {
		bearerToken: {
			// The secret token that clients must provide
			token: "sk-1234567890abcdef",
			
			// Optional: Custom header name (defaults to "Authorization")
			headerName: "Authorization",
			
			// Optional: Custom user profile for authenticated requests
			userProfile: {
				id: "api-client",
				username: "demo-user",
				email: "demo@example.com",
				scopes: ["read", "write", "admin"]
			}
		}
	},
	serverMetadata: {
		name: "Simple Token Auth Server",
		version: "1.0.0",
		description: "A simple MCP server with bearer token authentication",
		url: "http://localhost:3001",
		capabilities: {
			authentication: true,
			rateLimiting: false,
			retries: true,
			streaming: true,
		},
	},
});

// Start server
server.listen(3001, () => {
	console.log("🔐 Simple Token Auth MCP Server running on http://localhost:3001");
	console.log("🔑 Bearer Token: sk-1234567890abcdef");
	console.log("📚 Available resources:");
	console.log("  • notes - Create, read, delete, search notes");
	console.log("  • users - Read user information and profile");
	console.log("");
	console.log("🧪 Test with:");
	console.log("  curl -X POST http://localhost:3001 \\");
	console.log("    -H 'Content-Type: application/json' \\");
	console.log("    -H 'Authorization: Bearer sk-1234567890abcdef' \\");
	console.log("    -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}'");
	console.log("");
	console.log("⚠️  Authentication required for all endpoints!");
}); 