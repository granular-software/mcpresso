/**
 * Basic CRUD - Resource Management
 *
 * This example shows how to create a resource with standard CRUD operations.
 * mcpresso automatically generates MCP tools from your resource definition.
 */

import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define your data model with Zod
const UserSchema = z.object({
	id: z.string().readonly(),
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email"),
	createdAt: z.date().readonly(),
});

// In-memory storage (replace with your database)
const users: z.infer<typeof UserSchema>[] = [];

// Helper function to generate IDs
function generateId(): string {
	return Math.random().toString(36).substr(2, 9);
}

// Create a user resource with full CRUD operations
const userResource = createResource({
	name: "user",
	schema: UserSchema,
	uri_template: "users/{id}",
	methods: {
		// GET /users/{id}
		get: {
			description: "Retrieve a user by ID",
			handler: async ({ id }) => {
				const user = users.find((u) => u.id === id);
				if (!user) throw new Error(`User ${id} not found`);
				return user;
			},
		},

		// GET /users
		list: {
			description: "List all users",
			handler: async () => users,
		},

		// POST /users
		create: {
			description: "Create a new user",
			handler: async (data) => {
				const newUser: z.infer<typeof UserSchema> = {
					id: generateId(),
					name: data.name,
					email: data.email,
					createdAt: new Date(),
				};

				users.push(newUser);
				return newUser;
			},
		},

		// PUT /users/{id}
		update: {
			description: "Update an existing user",
			handler: async ({ id, ...data }) => {
				const index = users.findIndex((u) => u.id === id);
				if (index === -1) throw new Error(`User ${id} not found`);

				users[index] = { ...users[index], ...data };
				return users[index];
			},
		},

		// DELETE /users/{id}
		delete: {
			description: "Delete a user",
			handler: async ({ id }) => {
				const index = users.findIndex((u) => u.id === id);
				if (index === -1) throw new Error(`User ${id} not found`);

				const deleted = users.splice(index, 1)[0];
				return { success: true, deleted };
			},
		},
	},
});

// Create and start the server
const server = createMCPServer({
	name: "basic_crud_server",
	resources: [userResource],
});

server.listen(3000, () => {
	console.log("Basic CRUD Server running at http://localhost:3000");
	console.log("");
	console.log("Available MCP Tools:");
	console.log("  • get_user - Retrieve a user by ID");
	console.log("  • list_users - List all users");
	console.log("  • create_user - Create a new user");
	console.log("  • update_user - Update an existing user");
	console.log("  • delete_user - Delete a user");
	console.log("");
	console.log("Try creating a user with:");
	console.log("  create_user({ name: 'John Doe', email: 'john@example.com' })");
});
