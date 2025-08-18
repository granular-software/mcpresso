/**
 * Hello World - Minimal MCP Server
 * 
 * This example shows the absolute minimum needed to create a working MCP server.
 * Run this to see mcpresso in action with zero configuration.
 */

import { createMCPServer } from "../src/index.js";

// Create a server with no resources - just to prove it works
const server = createMCPServer({
  name: "hello_world_server",
  resources: [], // Empty array for no resources
});

// Start the server
server.listen(3000, () => {
  console.log("Hello World! Your MCP server is running at http://localhost:3000");
  console.log("");
  console.log("This server has:");
  console.log("  ✅ MCP protocol compliance");
  console.log("  ✅ Server-side events");
  console.log("  ✅ SSE streaming support");
  console.log("  ✅ Health check endpoint");
  console.log("");
  console.log("Next: Add resources to make it useful!");
}); 