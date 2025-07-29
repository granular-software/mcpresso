import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";
import { serve } from "@hono/node-server";

// Example: A simple notes API
const NoteSchema = z.object({
	id: z.string(),
	title: z.string(),
	content: z.string(),
	authorId: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

// In-memory storage (replace with your database)
const notes: z.infer<typeof NoteSchema>[] = [];

// Create the notes resource
const noteResource = createResource({
	name: "note",
	schema: NoteSchema,
	uri_template: "notes/{id}",
	methods: {
		get: {
			handler: async ({ id }) => {
				return notes.find((note) => note.id === id);
			},
		},
		list: {
			handler: async () => {
				return notes;
			},
		},
		create: {
			handler: async (data) => {
				const newNote = {
					id: Math.random().toString(36).substr(2, 9),
					...data,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				notes.push(newNote);
				return newNote;
			},
		},
		update: {
			handler: async ({ id, ...data }) => {
				const index = notes.findIndex((note) => note.id === id);
				if (index === -1) {
					return null;
				}
				notes[index] = { ...notes[index], ...data, updatedAt: new Date() };
				return notes[index];
			},
		},
		delete: {
			handler: async ({ id }) => {
				const index = notes.findIndex((note) => note.id === id);
				if (index === -1) {
					return { success: false };
				}
				notes.splice(index, 1);
				return { success: true };
			},
		},
		search: {
			description: "Search notes by title or content",
			inputSchema: z.object({
				query: z.string().describe("Search query"),
			}),
			handler: async ({ query }) => {
				return notes.filter(
					(note) =>
						note.title.toLowerCase().includes(query.toLowerCase()) ||
						note.content.toLowerCase().includes(query.toLowerCase())
				);
			},
		},
	},
});

// Create the MCP server
const app = createMCPServer({
	name: "notes-mcpresso-server",
	serverUrl: process.env.SERVER_URL || "http://localhost:3000",
	resources: [noteResource],
	exposeTypes: true,
	serverMetadata: {
		name: "Notes MCP Server",
		version: "1.0.0",
		description: "A simple notes API built with mcpresso",
		url: "http://localhost:3000",
		contact: {
			name: "Your Name",
			email: "your-email@example.com",
		},
		license: {
			name: "MIT",
			url: "https://opensource.org/licenses/MIT",
		},
		capabilities: {
			authentication: false,
			rateLimiting: false,
			retries: true,
			streaming: true,
		},
	},
});

// Start the server
serve(app, { port: 3000 });
console.log("🚀 Notes MCP Server running on http://localhost:3000");
console.log("📝 Try creating a note with: curl -X POST http://localhost:3000/"); 