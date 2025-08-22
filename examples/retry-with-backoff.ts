/**
 * Retry with Exponential Backoff Example
 * 
 * This example shows how to configure automatic retries with exponential backoff.
 * This is useful for handling transient failures in external services or databases.
 */

import { createMCPServer } from "../src/index.js";

const server = createMCPServer({
  name: "retry_server",
  resources: [],
  retry: {
    retries: 3,
    factor: 2,
    maxTimeout: 10000,
    minTimeout: 1000,
  },
});

server.listen(3000, () => {
  console.log("Retry-enabled MCP server running on http://localhost:3000");
  console.log("Configured with exponential backoff retry strategy");
}); 