import { z } from "zod";
import { createResource, createMCPServer } from "../src/index";

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

const tagResource = createResource({
	name: "tag",
	schema: TagSchema,
	uri_template: "tags/{id}",
	handlers: {
		get: async ({ id }) => tags.find((tag) => tag.id === id),
		list: async () => tags,
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
	methodConfig: {
		update: {
			pick: ["content", "tagIds"],
		},
		search: {
			schema: z.object({
				query: z.string().describe("The text to search for in the note content."),
			}),
		},
	},
	handlers: {
		get: async ({ id }) => {
			console.log(`Getting note with id: ${id}`);
			return notes.find((note) => note.id === id);
		},
		create: async (data) => {
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
		update: async ({ id, ...data }) => {
			console.log(`Updating note with id: ${id} with data:`, data);
			const index = notes.findIndex((note) => note.id === id);
			if (index === -1) {
				return undefined;
			}
			notes[index] = { ...notes[index], ...data };
			return notes[index];
		},
		delete: async ({ id }) => {
			console.log(`Deleting note with id: ${id}`);
			const index = notes.findIndex((note) => note.id === id);
			if (index === -1) {
				return false;
			}
			notes.splice(index, 1);
			return true;
		},
		list: async () => {
			console.log("Listing all notes");
			return notes;
		},
		search: async ({ query }) => {
			console.log(`Searching for notes with query: "${query}"`);
			return notes.filter((note) => note.content.includes(query));
		},
	},

	customMethods: {
		count_by_author: {
			description: "Counts how many notes an author has written.",
			inputSchema: z.object({
				authorId: z.string().describe("The ID of the author."),
			}),
			handler: async ({ authorId }) => {
				const count = notes.filter((note) => note.authorId === authorId).length;
				return { count };
			},
		},
	},
});

// Create a "user" resource
const userResource = createResource({
	name: "user",
	schema: UserSchema,
	uri_template: "users/{id}",
	handlers: {
		get: async ({ id }) => {
			return users.find((user) => user.id === id);
		},
		list: async () => {
			return users;
		},
	},
});

// Create the MCP server
const server = createMCPServer({
	name: "my_server",
	serverUrl: "http://localhost:3080",
	resources: [noteResource, userResource, tagResource],
	exposeTypes: [noteResource, userResource, tagResource],
	// auth: {
	//   issuer: 'https://your-auth-server.com', // e.g., your Auth0 or Okta issuer URL
	// },
});

// Start the server
server.listen(3080, () => {
	console.log("MCPresso server running on http://localhost:3080");
});
