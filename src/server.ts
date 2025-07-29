// Re-export the Express version since Hono is incompatible with MCP SDK
export { createMCPServer, createResource, getCurrentUser } from './index.js';
export type { 
  MCPServerConfig, 
  ResourceConfig, 
  ResourceBlueprint, 
  MethodDefinition,
  RetryConfig,
  RateLimitConfig,
  ServerMetadata
} from './index.js'; 