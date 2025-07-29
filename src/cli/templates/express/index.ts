import { Template } from '../types.js';
import { ProjectConfig } from '../../utils/project-creator.js';

export const expressTemplate: Template = {
  id: 'express',
  name: 'Express Server',
  description: 'Traditional Node.js server',
  category: 'self-hosted',
  features: ['Simple setup', 'Easy debugging', 'Familiar environment'],
  complexity: 'easy',

  getDependencies: () => ({
    'mcpresso': '^0.6.2',
    'zod': '^3.23.8',
    'hono': '^4.8.2',
    '@hono/node-server': '^1.0.0'
  }),

  getDevDependencies: () => ({
    '@types/node': '^20.0.0',
    'typescript': '^5.0.0',
    'bun-types': 'latest'
  }),

  getScripts: () => ({
    'dev': 'bun run --watch src/server.ts',
    'build': 'bun build src/server.ts --outdir dist --target node',
    'start': 'node dist/server.js',
    'typecheck': 'tsc --noEmit',
    'clean': 'rm -rf dist'
  }),

  generateFiles: async (config: ProjectConfig) => {
    const files: Record<string, string> = {};

    // Server file
    files['src/server.ts'] = generateServerFile(config);
    
    // Example resource
    files['src/resources/example.ts'] = generateResourceExample(config);
    
    // Environment variables
    files['.env.example'] = generateEnvFile(config);

    // OAuth config if enabled
    if (config.oauth) {
      files['src/auth/oauth.ts'] = generateOAuthConfig(config);
    }

    // Token config if enabled
    if (config.token) {
      files['src/auth/token.ts'] = generateTokenConfig(config);
    }

    return files;
  }
};

function generateServerFile(config: ProjectConfig): string {
  const authImports = [];
  const authConfigs = [];
  
  if (config.oauth) {
    authImports.push('import { oauthConfig } from "./auth/oauth.js";');
    authConfigs.push('auth: oauthConfig,');
  }
  
  if (config.token) {
    authImports.push('import { tokenConfig } from "./auth/token.js";');
    authConfigs.push('auth: tokenConfig,');
  }
  
  const authImport = authImports.length > 0 ? `\n${authImports.join('\n')}` : '';
  const authConfig = authConfigs.length > 0 ? `\n  ${authConfigs.join('\n  ')}` : '';

  return `import { z } from "zod";
import { createResource, createMCPServer } from "mcpresso";${authImport}

// Import your resources
import { exampleResource } from "./resources/example.js";

// Create the MCP server
const app = createMCPServer({
  name: "${config.name}",
  serverUrl: process.env.SERVER_URL || "http://localhost:3000",
  resources: [exampleResource],${authConfig}
  exposeTypes: true,
  serverMetadata: {
    name: "${config.name}",
    version: "1.0.0",
    description: "${config.description}",
    url: process.env.SERVER_URL || "http://localhost:3000",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    capabilities: {
      authentication: ${config.oauth || config.token},
      rateLimiting: false,
      retries: true,
      streaming: true,
    },
  },
});

// Export Express app (for frameworks that import it)
export default app;

// Local development server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number(process.env.PORT) || 3000;
  console.log("Starting mcpresso server on http://localhost:" + port);

  app.listen(port, () => {
    console.log("Server running on http://localhost:" + port);
  });
} 
`;
}

function generateResourceExample(config: ProjectConfig): string {
  return `import { z } from "zod";

export const exampleResource = {
  name: "Example Resource",
  description: "This is a placeholder for a real resource.",
  version: "1.0.0",
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "The unique identifier for the example resource.",
    },
    name: {
      type: "string",
      description: "The name of the example resource.",
    },
    createdAt: {
      type: "string",
      description: "The date and time the example resource was created.",
    },
  },
  required: ["id", "name"],
}; 
`;
}

function generateEnvFile(config: ProjectConfig): string {
  return `# ${config.name}

# Server
SERVER_URL=http://localhost:3000
PORT=3000

# Authentication
OAUTH_ENABLED=${config.oauth}
TOKEN_ENABLED=${config.token}

# Resources
RESOURCE_EXAMPLE_ENABLED=true

# Logging
LOG_LEVEL=info

# Development
DEV_MODE=true

# Testing
TEST_MODE=false 
`;
}

function generateOAuthConfig(config: ProjectConfig): string {
  return `import { z } from "zod";

export const oauthConfig = {
  name: "OAuth",
  description: "Authentication using OAuth 2.0",
  type: "oauth2",
  flows: {
    authorizationCode: {
      authorizationUrl: "https://example.com/oauth/authorize",
      tokenUrl: "https://example.com/oauth/token",
      scopes: {
        "read:example": "Read example resources",
        "write:example": "Write example resources",
      },
    },
  },
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  redirectUri: "http://localhost:3000/oauth/callback",
  scopes: ["read:example", "write:example"],
}; 
`;
}

function generateTokenConfig(config: ProjectConfig): string {
  return `import { z } from "zod";

export const tokenConfig = {
  name: "Token",
  description: "Authentication using a simple token",
  type: "http",
  flows: {
    clientCredentials: {
      tokenUrl: "https://example.com/token",
      scopes: {
        "read:example": "Read example resources",
        "write:example": "Write example resources",
      },
    },
  },
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  scopes: ["read:example", "write:example"],
}; 
`;
} 