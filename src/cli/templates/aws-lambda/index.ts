import { Template } from '../types.js';
import { ProjectConfig } from '../../utils/project-creator.js';

export const awsLambdaTemplate: Template = {
  id: 'aws-lambda',
  name: 'AWS Lambda',
  description: 'Serverless compute service',
  category: 'cloud',
  features: ['Pay-per-request', 'Custom domains', 'Advanced monitoring'],
  complexity: 'medium',

  getDependencies: () => ({
    'mcpresso': '^1.1.0',
    'zod': '^3.23.8',
    'hono': '^4.8.2',
    '@hono/aws-lambda': '^1.0.0'
  }),

  getDevDependencies: () => ({
    '@types/node': '^20.0.0',
    'typescript': '^5.0.0',
    'bun-types': 'latest',
    'serverless': '^3.0.0',
    '@types/aws-lambda': '^8.10.0'
  }),

  getScripts: () => ({
    'dev': 'bun run --watch src/server.ts',
    'build': 'bun build src/server.ts --outdir dist --target node',
    'start': 'node dist/server.js',
    'typecheck': 'tsc --noEmit',
    'clean': 'rm -rf dist',
    'deploy': 'serverless deploy',
    'deploy:prod': 'serverless deploy --stage production',
    'remove': 'serverless remove'
  }),

  generateFiles: async (config: ProjectConfig) => {
    const files: Record<string, string> = {};

    // Server file
    files['src/server.ts'] = generateServerFile(config);
    
    // Example resource
    files['src/resources/example.ts'] = generateResourceExample(config);
    
    // Serverless config
    files['serverless.yml'] = `service: ${config.name}

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    SERVER_URL: \${self:custom.apiUrl}

functions:
  api:
    handler: dist/server.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

custom:
  apiUrl: \${self:service}-\${self:provider.stage}.execute-api.\${self:provider.region}.amazonaws.com/\${self:provider.stage}`;

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
import { createResource, createMCPServer } from "mcpresso";
import { handle } from "@hono/aws-lambda";${authImport}

// Import your resources
import { exampleResource } from "./resources/example.js";

// Create the MCP server
const app = createMCPServer({
  name: "${config.name}",
  serverUrl: process.env.SERVER_URL || "https://your-api-gateway-url.amazonaws.com",
  resources: [exampleResource],${authConfig}
  exposeTypes: true,
  serverMetadata: {
    name: "${config.name}",
    version: "1.0.0",
    description: "${config.description}",
    url: process.env.SERVER_URL || "https://your-api-gateway-url.amazonaws.com",
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

// Export for AWS Lambda
export const handler = handle(app);

// Local development server
if (import.meta.main) {
  const port = process.env.PORT || 3000;
  console.log("Starting mcpresso server on port " + port);
  console.log("MCP Inspector URL: http://localhost:" + port);
  
  const server = app.fetch;
  const httpServer = new (await import('http')).createServer(server);
  httpServer.listen(port, () => {
    console.log("Server running on http://localhost:" + port);
  });
}`;
}

function generateResourceExample(config: ProjectConfig): string {
  return `import { z } from "zod";
import { createResource } from "mcpresso";

// Example: A simple note resource
const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// In-memory storage (replace with your database)
const notes: z.infer<typeof NoteSchema>[] = [];

// Create the notes resource
export const exampleResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  methods: {
    get: {
      handler: async ({ id }) => {
        return notes.find((note) => note.id === id);
      },
    },
    list: {
      handler: async () => {
        return notes;
      },
    },
    create: {
      handler: async (data) => {
        const newNote = {
          id: Math.random().toString(36).substr(2, 9),
          title: data.title || "",
          content: data.content || "",
          authorId: data.authorId || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        notes.push(newNote);
        return newNote;
      },
    },
    update: {
      handler: async ({ id, ...data }) => {
        const index = notes.findIndex((note) => note.id === id);
        if (index === -1) {
          throw new Error("Note not found");
        }
        const updatedNote = { 
          ...notes[index], 
          ...data, 
          updatedAt: new Date() 
        };
        notes[index] = updatedNote;
        return updatedNote;
      },
    },
    delete: {
      handler: async ({ id }) => {
        const index = notes.findIndex((note) => note.id === id);
        if (index === -1) {
          return { success: false };
        }
        notes.splice(index, 1);
        return { success: true };
      },
    },
    search: {
      description: "Search notes by title or content",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async ({ query }) => {
        return notes.filter(
          (note) =>
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase())
        );
      },
    },
  },
});`;
}

function generateEnvFile(config: ProjectConfig): string {
  let envContent = `# Environment Variables for ${config.name}
# Copy this file to .env and update the values

# Server Configuration
NODE_ENV=development
PORT=3000
SERVER_URL=https://your-api-gateway-url.amazonaws.com

# AWS Lambda Configuration
# These will be set automatically by AWS
# SERVER_URL=https://your-api-gateway-url.amazonaws.com
AWS_REGION=us-east-1
`;

  if (config.oauth) {
    envContent += `
# OAuth 2.1 Configuration
OAUTH_ISSUER=https://your-api-gateway-url.amazonaws.com
JWT_SECRET=your-secret-key-change-this-in-production

# TODO: Update these values for production
# OAUTH_ISSUER=https://your-domain.com
# JWT_SECRET=your-secure-secret-key
`;
  }

  if (config.token) {
    envContent += `
# Bearer Token Authentication
# Generate a secure random token for production
BEARER_TOKEN=sk-1234567890abcdef

# TODO: Update this value for production
# BEARER_TOKEN=your-secure-random-token
`;
  }

  envContent += `
# Database Configuration (if needed)
# DATABASE_URL=your-database-url
# REDIS_URL=your-redis-url

# External API Keys (if needed)
# API_KEY=your-api-key
# WEBHOOK_SECRET=your-webhook-secret
`;

  return envContent;
}

function generateOAuthConfig(config: ProjectConfig): string {
  return `import { MCPOAuthServer } from "mcpresso-oauth-server";

// OAuth configuration
export const oauthConfig = {
  oauthServer: new MCPOAuthServer({
    issuer: process.env.OAUTH_ISSUER || "https://your-api-gateway-url.amazonaws.com",
    serverUrl: process.env.SERVER_URL || "https://your-api-gateway-url.amazonaws.com",
    jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this",
    auth: {
      authenticateUser: async (credentials, context) => {
        // TODO: Implement your authentication logic
        // Example:
        // const user = await db.users.findByEmail(credentials.username);
        // return user && await bcrypt.compare(credentials.password, user.hashedPassword) ? user : null;
        
        // For now, accept any credentials (replace with real auth)
        if (credentials.username === "admin" && credentials.password === "password") {
          return {
            id: "1",
            email: credentials.username,
            name: "Admin User"
          };
        }
        return null;
      },
      renderLoginPage: async (context, error) => {
        // TODO: Customize your login page
        return \`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Login - ${config.name}</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; }
                input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .error { color: red; margin-bottom: 15px; }
              </style>
            </head>
            <body>
              <h2>Login to ${config.name}</h2>
              \${error ? \`<div class="error">\${error}</div>\` : ''}
              <form method="POST">
                <div class="form-group">
                  <label for="username">Username:</label>
                  <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                  <label for="password">Password:</label>
                  <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
              </form>
              <p><small>Default: admin/password</small></p>
            </body>
          </html>
        \`;
      }
    }
  }),
  serverUrl: process.env.SERVER_URL || "https://your-api-gateway-url.amazonaws.com",
  userLookup: async (jwtPayload) => {
    // TODO: Implement user lookup from your database
    // Example:
    // return await db.users.findById(jwtPayload.sub);
    
    // For now, return a basic user profile
    return {
      id: jwtPayload.sub,
      email: jwtPayload.email,
      name: jwtPayload.name
    };
  }
};`;
}

function generateTokenConfig(config: ProjectConfig): string {
  return `// Bearer token authentication configuration
export const tokenConfig = {
  bearerToken: {
    // The secret token that clients must provide
    // Change this to a secure, randomly generated token in production
    token: process.env.BEARER_TOKEN || "sk-1234567890abcdef",
    
    // Optional: Custom header name (defaults to "Authorization")
    headerName: "Authorization",
    
    // Optional: Custom user profile for authenticated requests
    userProfile: {
      id: "bearer-user",
      username: "api-client",
      email: "api@example.com",
      scopes: ["read", "write"]
    }
  },
  
  // Optional: Custom error messages
  errorHandling: {
    includeDetails: true,
    messages: {
      missingToken: "Authorization header with Bearer token is required",
      invalidToken: "Invalid bearer token"
    }
  },
  
  // Optional: Logging configuration
  logging: {
    logSuccess: false,
    logFailures: true,
    logValidation: false
  }
};`;
} 