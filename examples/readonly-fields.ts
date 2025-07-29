import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// This example demonstrates the new readonly fields approach.
// Properties marked with .readonly() are automatically excluded from create/update operations.

console.log("Starting readonly fields example...");

// 1. Define schemas with readonly properties
const UserSchema = z.object({
	// Readonly properties (server-managed)
	id: z.string().readonly(),
	createdAt: z.date().readonly(),
	updatedAt: z.date().readonly(),
	lastLoginAt: z.date().readonly(),
	
	// Editable properties
	name: z.string(),
	email: z.string().email(),
	avatar: z.string().url().optional(),
});

const PostSchema = z.object({
	// Readonly properties (server-managed)
	id: z.string().readonly(),
	createdAt: z.date().readonly(),
	updatedAt: z.date().readonly(),
	
	// Computed readonly properties
	viewCount: z.number().readonly(),
	likeCount: z.number().readonly(),
	slug: z.string().readonly(),
	
	// Editable properties
	title: z.string(),
	content: z.string(),
	authorId: z.string(), // Can be changed (e.g., transfer ownership)
	publishedAt: z.date().optional(),
	tags: z.array(z.string()).optional(),
});

const CommentSchema = z.object({
	// Readonly properties (server-managed)
	id: z.string().readonly(),
	createdAt: z.date().readonly(),
	updatedAt: z.date().readonly(),
	
	// Readonly references (can't be changed after creation)
	postId: z.string().readonly(),
	authorId: z.string().readonly(),
	
	// Editable properties
	content: z.string(),
	isModerated: z.boolean().optional(),
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
					avatar: "https://example.com/avatar.jpg",
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-15"),
					lastLoginAt: new Date("2024-01-14"),
				};
			},
		},
		create: {
			description: "Create a new user",
			handler: async (data) => {
				console.log(`-> Creating user:`, data);
				// Note: data only contains editable fields (name, email, avatar)
				// readonly fields (id, createdAt, etc.) are automatically excluded
				return {
					id: "user-" + Date.now(),
					...data,
					createdAt: new Date(),
					updatedAt: new Date(),
					lastLoginAt: new Date(),
				};
			},
		},
		update: {
			description: "Update an existing user",
			handler: async ({ id, ...data }) => {
				console.log(`-> Updating user ${id}:`, data);
				// Note: data only contains editable fields
				// readonly fields are automatically excluded
				return {
					id,
					name: data.name || "John Doe",
					email: data.email || "john@example.com",
					avatar: data.avatar,
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date(),
					lastLoginAt: new Date("2024-01-14"),
				};
			},
		},
		list: {
			description: "List all users",
			handler: async () => {
				console.log("-> Listing users");
				return [
					{
						id: "user-1",
						name: "John Doe",
						email: "john@example.com",
						avatar: "https://example.com/avatar1.jpg",
						createdAt: new Date("2024-01-01"),
						updatedAt: new Date("2024-01-15"),
						lastLoginAt: new Date("2024-01-14"),
					},
					{
						id: "user-2",
						name: "Jane Smith",
						email: "jane@example.com",
						createdAt: new Date("2024-01-02"),
						updatedAt: new Date("2024-01-10"),
						lastLoginAt: new Date("2024-01-09"),
					},
				];
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
					tags: ["sample", "demo"],
					viewCount: 42,
					likeCount: 7,
					slug: "sample-post",
					createdAt: new Date("2024-01-10"),
					updatedAt: new Date("2024-01-15"),
				};
			},
		},
		create: {
			description: "Create a new post",
			handler: async (data) => {
				console.log(`-> Creating post:`, data);
				// Note: data only contains editable fields (title, content, authorId, etc.)
				// readonly fields (id, viewCount, likeCount, etc.) are automatically excluded
				return {
					id: "post-" + Date.now(),
					...data,
					viewCount: 0,
					likeCount: 0,
					slug: data.title.toLowerCase().replace(/\s+/g, "-"),
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			},
		},
		update: {
			description: "Update an existing post",
			handler: async ({ id, ...data }) => {
				console.log(`-> Updating post ${id}:`, data);
				// Note: data only contains editable fields
				// readonly fields are automatically excluded
				return {
					id,
					title: data.title || "Sample Post",
					content: data.content || "This is a sample post content.",
					authorId: data.authorId || "user-123",
					publishedAt: data.publishedAt,
					tags: data.tags,
					viewCount: 42, // This would be preserved from existing post
					likeCount: 7,  // This would be preserved from existing post
					slug: "sample-post", // This would be preserved from existing post
					createdAt: new Date("2024-01-10"),
					updatedAt: new Date(),
				};
			},
		},
	},
});

const commentResource = createResource({
	name: "comment",
	schema: CommentSchema,
	uri_template: "comments/{id}",
	methods: {
		get: {
			description: "Retrieve a comment by ID",
			handler: async ({ id }) => {
				console.log(`-> Getting comment: ${id}`);
				return {
					id: id,
					content: "This is a great post!",
					postId: "post-123",
					authorId: "user-456",
					isModerated: false,
					createdAt: new Date("2024-01-12"),
					updatedAt: new Date("2024-01-12"),
				};
			},
		},
		create: {
			description: "Create a new comment",
			handler: async (data) => {
				console.log(`-> Creating comment:`, data);
				// Note: data only contains editable fields (content, isModerated)
				// readonly fields (id, postId, authorId, etc.) are automatically excluded
				// postId and authorId would typically come from the request context
				return {
					id: "comment-" + Date.now(),
					...data,
					postId: "post-123", // Would come from request context
					authorId: "user-456", // Would come from request context
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			},
		},
		update: {
			description: "Update an existing comment",
			handler: async ({ id, ...data }) => {
				console.log(`-> Updating comment ${id}:`, data);
				// Note: data only contains editable fields (content, isModerated)
				// readonly fields (postId, authorId) cannot be changed
				return {
					id,
					content: data.content || "This is a great post!",
					postId: "post-123", // Cannot be changed
					authorId: "user-456", // Cannot be changed
					isModerated: data.isModerated,
					createdAt: new Date("2024-01-12"),
					updatedAt: new Date(),
				};
			},
		},
	},
});

// 3. Create the MCP server
const server = createMCPServer({
	name: "readonly_example_server",
	resources: [userResource, postResource, commentResource],
	exposeTypes: true,
	serverMetadata: {
		name: "Readonly Fields Example Server",
		version: "1.0.0",
		description: "Demonstrates the new readonly fields approach using Zod's .readonly() method",
		contact: {
			name: "MCPresso Team",
			email: "support@example.com",
		},
	},
});

// 4. Start the server
server.listen(3084, () => {
	console.log("MCPresso readonly fields example running on http://localhost:3084");
	console.log("");
	console.log("📋 Available MCP Resources:");
	console.log("  • user - User management with readonly timestamps");
	console.log("  • post - Post management with readonly computed fields");
	console.log("  • comment - Comment management with readonly references");
	console.log("");
	console.log("🔍 Key Features Demonstrated:");
	console.log("  • Server-managed fields (id, createdAt, updatedAt) are readonly");
	console.log("  • Computed fields (viewCount, likeCount, slug) are readonly");
	console.log("  • Reference fields can be readonly (comment.postId, comment.authorId)");
	console.log("  • Editable fields (name, email, title, content) are not readonly");
	console.log("");
	console.log("✅ Benefits:");
	console.log("  • No complex omit/pick configuration needed");
	console.log("  • Type-safe and self-documenting");
	console.log("  • Automatic exclusion from create/update operations");
	console.log("  • Clear distinction between editable and readonly properties");
}); 