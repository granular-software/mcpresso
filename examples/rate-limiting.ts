/**
 * Rate Limiting Example
 * 
 * This example shows how to configure rate limiting for your MCP server.
 * Rate limiting helps protect your server from abuse and ensures fair usage.
 */

import { createMCPServer } from "../src/index.js";

const server = createMCPServer({
  name: "rate_limited_server",
  resources: [],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  },
});

server.listen(3000, () => {
  console.log("Rate-limited MCP server running on http://localhost:3000");
  console.log("Try making many requests quickly to see rate limiting in action");
}); 