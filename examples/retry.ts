import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// This example demonstrates the automatic retry functionality.
// The "unstable_task" resource has a handler that will randomly fail
// to simulate a transient error. Run this server and try to get the
// task multiple times to see the retry logic in action.

console.log("Starting retry example server...");

// 1. Define a schema for a simple task
const UnstableTaskSchema = z.object({
	id: z.string(),
	status: z.string(),
	lastAttempt: z.date(),
});

// 2. Create a resource with a handler that fails randomly
const unstableTaskResource = createResource({
	name: "unstable_task",
	schema: UnstableTaskSchema,
	uri_template: "tasks/{id}",
	methods: {
		get: {
			description: "Get a task that might fail.",
			handler: async ({ id }) => {
				console.log(`\nAttempting to get task with id: ${id}`);

				// Simulate a 75% chance of failure
				if (Math.random() < 0.75) {
					console.error("-> Handler failed!");
					throw new Error("A transient error occurred!");
				}

				console.log("-> Handler succeeded!");
				return {
					id,
					status: "completed",
					lastAttempt: new Date(),
				};
			},
		},
	},
});

// 3. Create the MCP server with retry configuration
const server = createMCPServer({
	name: "retry_server",
	resources: [unstableTaskResource],
	// Configure automatic retries for failed handlers
	retry: {
		retries: 15, // Attempt the initial call + 15 retries = 16 total attempts
		factor: 2,
		minTimeout: 250, // Start with a 250ms delay
		maxTimeout: 20000, // Cap delays at 20 seconds
	},
});

// 4. Start the server
server.listen(3081, () => {
	console.log("MCPresso retry example server running on http://localhost:3081");
	console.log("Try calling the 'get_unstable_task' tool to test the retry logic.");
}); 