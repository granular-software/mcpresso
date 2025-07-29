import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define schemas
const NoteSchema = z.object({
	id: z.string(),
	title: z.string(),
	content: z.string(),
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
		title: "Welcome Note",
		content: "This is a public note that anyone can access.",
		createdAt: new Date("2024-01-01"),
	},
	{
		id: "2", 
		title: "Getting Started",
		content: "This server has no authentication - all data is public.",
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
			description: "Get a note by ID (public access)",
			handler: async ({ id }) => {
				console.log(`Getting note ${id} (no auth required)`);
				return notes.find((note) => note.id === id);
			},
		},
		list: {
			description: "List all notes (public access)",
			handler: async () => {
				console.log("Listing all notes (no auth required)");
				return notes;
			},
		},
		create: {
			description: "Create a new note (public access)",
			handler: async (data) => {
				console.log("Creating note (no auth required):", data);
				
				const newNote = {
					id: (notes.length + 1).toString(),
					title: data.title || "Untitled",
					content: data.content || "",
					createdAt: new Date(),
				};
				
				notes.push(newNote);
				return newNote;
			},
		},
		delete: {
			description: "Delete a note (public access)",
			handler: async ({ id }) => {
				console.log(`Deleting note ${id} (no auth required)`);
				
				const index = notes.findIndex((note) => note.id === id);
				if (index === -1) {
					return { success: false };
				}
				
				notes.splice(index, 1);
				return { success: true };
			},
		},
		search: {
			description: "Search notes by content (public access)",
			inputSchema: z.object({
				query: z.string().describe("Search query"),
			}),
			handler: async ({ query }) => {
				console.log(`Searching notes for "${query}" (no auth required)`);
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
			description: "Get a user by ID (public access)",
			handler: async ({ id }) => {
				console.log(`Getting user ${id} (no auth required)`);
				return users.find((user) => user.id === id);
			},
		},
		list: {
			description: "List all users (public access)",
			handler: async () => {
				console.log("Listing all users (no auth required)");
				return users;
			},
		},
	},
});

// Create MCP server with NO authentication
const server = createMCPServer({
	name: "simple_no_auth_server",
	serverUrl: "http://localhost:3000",
	resources: [noteResource, userResource],
	exposeTypes: true,
	serverMetadata: {
		name: "Simple No-Auth Server",
		version: "1.0.0",
		description: "A simple MCP server with no authentication",
		url: "http://localhost:3000",
		capabilities: {
			authentication: false,
			rateLimiting: false,
			retries: true,
			streaming: true,
		},
	},
});

// Start server
server.listen(3000, () => {
	console.log("🚀 Simple No-Auth MCP Server running on http://localhost:3000");
	console.log("📝 No authentication required - all endpoints are public");
	console.log("📚 Available resources:");
	console.log("  • notes - Create, read, delete, search notes");
	console.log("  • users - Read user information");
	console.log("");
	console.log("🧪 Test with:");
	console.log("  curl -X POST http://localhost:3000 \\");
	console.log("    -H 'Content-Type: application/json' \\");
	console.log("    -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1.0.0\"}}}'");
}); 