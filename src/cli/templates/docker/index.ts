import { Template } from '../types.js';
import { ProjectConfig } from '../../utils/project-creator.js';

export const dockerTemplate: Template = {
  id: 'docker',
  name: 'Docker Container',
  description: 'Self-hosted containerized deployment',
  category: 'self-hosted',
  features: ['Full control', 'No vendor lock-in', 'Custom networking'],
  complexity: 'medium',

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
    'clean': 'rm -rf dist',
    'docker:build': 'docker build -t ${config.name} .',
    'docker:run': 'docker run -p 3000:3000 ${config.name}',
    'docker:compose': 'docker-compose up -d',
    'docker:compose:down': 'docker-compose down'
  }),

  generateFiles: async (config: ProjectConfig) => {
    const files: Record<string, string> = {};

    // Server file
    files['src/server.ts'] = generateServerFile(config);
    
    // Example resource
    files['src/resources/example.ts'] = generateResourceExample(config);
    
    // Dockerfile
    files['Dockerfile'] = `FROM oven/bun:1 as base

WORKDIR /app
COPY package.json bun.lockb ./ 
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

EXPOSE 3000
CMD ["bun", "run", "dist/server.js"]`;

    // Docker Compose
    files['docker-compose.yml'] = `version: '3.8'

services:
  ${config.name}:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SERVER_URL=http://localhost:3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3`;

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

// Export for Docker/Express
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

// --- Helper template generators (minimal stubs) ---
function generateResourceExample(_config: ProjectConfig): string {
  return "// TODO: implement resource example";
}

function generateEnvFile(_config: ProjectConfig): string {
  return "# .env example\nPORT=3000\nSERVER_URL=http://localhost:3000";
}

function generateOAuthConfig(_config: ProjectConfig): string {
  return "export const oauthConfig = {};";
}

function generateTokenConfig(_config: ProjectConfig): string {
  return "export const tokenConfig = {};";
} 