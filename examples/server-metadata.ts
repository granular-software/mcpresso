/**
 * Server Metadata Example
 * 
 * This example shows how to enable server metadata, which exposes your server's
 * capabilities and information as an MCP resource. This helps AI agents understand
 * what your server can do.
 */

import { createMCPServer } from "../src/index.js";

const server = createMCPServer({
  name: "metadata_server",
  resources: [],
  serverMetadata: {
    name: "metadata_server",
    version: "1.0.0",
    description: "A sample MCP server with metadata enabled",
    contact: {
      name: "Your Team",
      email: "support@example.com",
    },
  },
});

server.listen(3000, () => {
  console.log("Metadata-enabled MCP server running on http://localhost:3000");
  console.log("Server capabilities and information are exposed as MCP resources");
}); 