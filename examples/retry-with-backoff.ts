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
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
  },
});

server.listen(3000, () => {
  console.log("Retry-enabled MCP server running on http://localhost:3000");
  console.log("Configured with exponential backoff retry strategy");
}); 