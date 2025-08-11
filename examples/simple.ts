import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define a schema for our tags
const TagSchema = z.object({
	id: z.string(),
	name: z.string(),
});

const NoteSchema = z.object({
	id: z.string(),
	content: z.string(),
	authorId: z.string(),
	tagIds: z.array(z.string()),
	createdAt: z.date(),
});

const UserSchema = z.object({
	id: z.string(),
	name: z.string(),
});

const tags: z.infer<typeof TagSchema>[] = [
	{ id: "1", name: "tech" },
	{ id: "2", name: "productivity" },
];

const notes: z.infer<typeof NoteSchema>[] = [];

const users: z.infer<typeof UserSchema>[] = [
	{ id: "1", name: "Bernard" },
	{ id: "2", name: "Bob" },
];

// Create a "tag" resource
const tagResource = createResource({
	name: "tag",
	schema: TagSchema,
	uri_template: "tags/{id}",
	methods: {
		get: {
			handler: async ({ id }) => tags.find((tag) => tag.id === id),
		},
		list: {
			handler: async () => tags,
		},
	},
});

// Create a "note" resource
const noteResource = createResource({
	name: "note",
	schema: NoteSchema,
	uri_template: "notes/{id}",
	relations: {
		authorId: { type: "user" },
		tagIds: { type: "tag" },
	},
	methods: {
		get: {
			handler: async ({ id }) => {
				console.log(`Getting note with id: ${id}`);
				return notes.find((note) => note.id === id);
			},
		},
		create: {
			handler: async (data) => {
				console.log("Creating a new note with data:", data);

				if (!data.authorId) {
					throw new Error("Missing authorId");
				}
				const authorExists = users.some((user) => user.id === data.authorId);
				if (!authorExists) {
					throw new Error(`Author with id '${data.authorId}' not found.`);
				}

				if (!data.tagIds) {
					throw new Error("Missing tagIds");
				}
				for (const tagId of data.tagIds) {
					if (!tags.some((tag) => tag.id === tagId)) {
						throw new Error(`Tag with id '${tagId}' not found.`);
					}
				}

				const newNote = {
					id: (notes.length + 1).toString(),
					createdAt: new Date(),
					content: data.content ?? "",
					authorId: data.authorId,
					tagIds: data.tagIds,
				};

				notes.push(newNote);
				return newNote;
			},
		},
		update: {
			// Override the default input schema to only allow picking certain fields
			// inputSchema: NoteSchema.pick({ content: true, tagIds: true }).partial().extend({ id: z.string() }),
			
            handler: async ({ id, ...data }) => {
				console.log(`Updating note with id: ${id} with data:`, data);
				const index = notes.findIndex((note) => note.id === id);
				if (index === -1) {
					return null as any; // MCP server will return null
				}
				notes[index] = { ...notes[index], ...data };
				return notes[index];
			},
		},
		delete: {
			handler: async ({ id }) => {
				console.log(`Deleting note with id: ${id}`);
				const index = notes.findIndex((note) => note.id === id);
				if (index === -1) {
					return { success: false };
				}
				notes.splice(index, 1);
				return { success: true };
			},
		},
		list: {
			handler: async () => {
				console.log("Listing all notes");
				return notes;
			},
		},
		search: {
			description: "Search for notes by a query string.",
			inputSchema: z.object({
				query: z.string().describe("The text to search for in the note content."),
			}),
			handler: async ({ query }) => {
				console.log(`Searching for notes with query: "${query}"`);
				return notes.filter((note) => note.content.includes(query));
			},
		},
		count_by_author: {
			description: "Counts how many notes an author has written.",
			inputSchema: z.object({
				authorId: z.string().describe("The ID of the author."),
			}),
			outputSchema: z.object({
				count: z.number(),
			}),
			handler: async ({ authorId }) => {
				const count = notes.filter((note) => note.authorId === authorId).length;
				return { count };
			},
		},
	},
});


const server = createMCPServer({
	name: "my_server",
	resources: [noteResource],
	exposeTypes: [noteResource],
});

server.listen(3080, () => {
	console.log("MCPresso server running on http://localhost:3080");
});
