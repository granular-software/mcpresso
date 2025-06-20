import express, { text, type Request, type Response } from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { type CallToolResult, type GetPromptResult, type ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

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

const app = express();
app.use(express.json());

const server = getServer();

setTimeout(() => {
	server.tool("multiply", "Multiplies two numbers", { a: z.number().describe("The first number"), b: z.number().describe("The second number") }, async ({ a, b }) => ({
		content: [{ type: "text", text: String(a * b) }],
	}));
	console.log("Added multiply tool");
}, 15000);

app.post("/mcp", async (req: Request, res: Response) => {
	try {
		const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});
		await server.connect(transport);
		await transport.handleRequest(req, res, req.body);
		res.on("close", () => {
			console.log("Request closed");
			transport.close();
			server.close();
		});
	} catch (error) {
		console.error("Error handling MCP request:", error);
		if (!res.headersSent) {
			res.status(500).json({
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: "Internal server error",
				},
				id: null,
			});
		}
	}
});

app.get("/mcp", async (req: Request, res: Response) => {
	console.log("Received GET MCP request");
	res.writeHead(405).end(
		JSON.stringify({
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "Method not allowed.",
			},
			id: null,
		}),
	);
});

app.delete("/mcp", async (req: Request, res: Response) => {
	console.log("Received DELETE MCP request");
	res.writeHead(405).end(
		JSON.stringify({
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "Method not allowed.",
			},
			id: null,
		}),
	);
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
	console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});

// Handle server shutdown
process.on("SIGINT", async () => {
	console.log("Shutting down server...");
	process.exit(0);
});
