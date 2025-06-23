import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { type CallToolResult, type GetPromptResult, type ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from 'node:url';

const getServer = () => {
	// Create an MCP server with implementation details
	const server = new McpServer(
		{
			name: "stateless-streamable-http-server",
			version: "1.0.0",
		},
		{ capabilities: { logging: {} } },
	);

	// Register a simple prompt
	server.prompt(
		"greeting-template",
		"A simple greeting prompt template",
		{
			firstname: z.string().describe("First name to include in greeting"),
			lastname: z.string().describe("Last name to include in greeting"),
		},
		async ({ firstname, lastname }): Promise<GetPromptResult> => {
			return {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Please greet ${firstname} ${lastname} in a friendly manner.`,
						},
					},
				],
			};
		},
	);

	// Register a tool specifically for testing resumability
	server.tool(
		"start-notification-stream",
		"Starts sending periodic notifications for testing resumability",
		{
			interval: z.number().describe("Interval in milliseconds between notifications").default(100),
			count: z.number().describe("Number of notifications to send (0 for 100)").default(10),
		},
		async ({ interval, count }, { sendNotification, requestId, authInfo }): Promise<CallToolResult> => {
			const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
			let counter = 0;
			console.log("Request ID:", requestId);
			console.log("Auth Info:", authInfo);

			while (count === 0 || counter < count) {
				counter++;
				try {
					await sendNotification({
						method: "notifications/message",
						params: {
							level: "info",
							data: `Periodic notification #${counter} at ${new Date().toISOString()}`,
						},
					});
				} catch (error) {
					console.error("Error sending notification:", error);
				}
				// Wait for the specified interval
				await sleep(interval);
			}

			return {
				content: [
					{
						type: "text",
						text: `Started sending periodic notifications every ${interval}ms`,
					},
				],
			};
		},
	);

	server.tool("add", "Adds two numbers", { a: z.number().describe("The first number"), b: z.number().describe("The second number") }, async ({ a, b }) => ({
		content: [{ type: "text", text: String(a + b) }],
	}));

	server.resource("echo", "https://example.com/echolisr-", { mimeType: "text/plain" }, async (uri) => ({
		contents: [
			{
				uri: uri.href,
				text: "hello!",
			},
		],
	}));

	server.resource("greeting", new ResourceTemplate("https://example.com/greet/{name}", { list: undefined }), async (uri, { name }) => ({
		contents: [
			{
				uri: uri.href,
				text: `Hello, ${name}!`,
			},
		],
	}));

	server.resource(
		"type",
		"type://granular.software/user",
		{
			mimeType: "application/json",
		},
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify({
						name: "John Doe",
						age: 30,
					}),
				},
			],
		}),
	);

	return server;
};

export const app = new Hono();

// Add CORS middleware
app.use("/mcp", cors());

// Optional: Add a logger middleware
// app.use('*', logger())

const server = getServer();

setTimeout(() => {
	server.tool(
		"multiply",
		"Multiplies two numbers",
		{ a: z.number().describe("The first number"), b: z.number().describe("The second number") },
		async ({ a, b }) => ({
			content: [{ type: "text", text: String(a * b) }],
		}),
	);
	console.log("Added multiply tool");
}, 15000);

app.post("/mcp", async (c) => {
	try {
		const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});
		await server.connect(transport);

		const body = await c.req.json();
		// Hono's `c.res` is a `Response` object. The transport expects a `ServerResponse`.
		// We can use the underlying node response object.
		// @ts-expect-error - 'raw' is available from node-server
		const nodeResponse = c.res.raw;
		// @ts-expect-error - 'raw' is available from node-server
		await transport.handleRequest(c.req.raw, nodeResponse, body);

		// The transport handles the response, so we return an empty response from Hono.
		// The connection will be kept alive by the transport.
		// We need to wait for the transport to close to end the request.
		await new Promise<void>((resolve) => {
			nodeResponse.on("close", () => {
				console.log("Request closed");
				transport.close();
				server.close();
				resolve();
			});
		});
		return nodeResponse;
	} catch (error) {
		console.error("Error handling MCP request:", error);
		return c.json(
			{
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: "Internal server error",
				},
				id: null,
			},
			500,
		);
	}
});

app.get("/mcp", (c) => {
	console.log("Received GET MCP request");
	return c.json(
		{
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "Method not allowed.",
			},
			id: null,
		},
		405,
	);
});

app.delete("/mcp", (c) => {
	console.log("Received DELETE MCP request");
	return c.json(
		{
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "Method not allowed.",
			},
			id: null,
		},
		405,
	);
});

// Start the server only when run directly
if (require.main === module) {
	const PORT = 4000;
	serve({
		fetch: app.fetch,
		port: PORT,
	});
	console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
}

// Handle server shutdown
process.on("SIGINT", async () => {
	console.log("Shutting down server...");
	process.exit(0);
});
