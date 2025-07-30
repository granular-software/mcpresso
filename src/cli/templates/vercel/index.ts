import { Template } from '../types.js';
import { ProjectConfig } from '../../utils/project-creator.js';
import crypto from 'crypto';

export const vercelTemplate: Template = {
  id: 'vercel',
  name: 'Vercel Functions',
  description: 'Serverless functions with edge runtime',
  category: 'cloud',
  features: ['Edge runtime', 'Global CDN', 'Automatic HTTPS', 'Git integration'],
  complexity: 'easy',

  getDependencies: () => ({
    'mcpresso': '^0.7.7',
    'zod': '^3.23.8',
    'hono': '^4.8.2',
    'bcryptjs': '^2.4.3',
    'mcpresso-oauth-server': '^1.1.0',
    'pg': '^8.11.3'
  }),

  getDevDependencies: () => ({
    '@types/node': '^20.0.0',
    'typescript': '^5.0.0',
    'bun-types': 'latest',
    'vercel': '^32.0.0',
    '@types/bcryptjs': '^2.4.2',
    '@types/pg': '^8.10.9'
  }),

  getScripts: () => ({
    'dev': 'bun run --watch src/server.ts',
    'build': 'bun build src/server.ts --outdir dist --target node',
    'start': 'node dist/server.js',
    'typecheck': 'tsc --noEmit',
    'clean': 'rm -rf dist',
    // Show instructions before deploying to ensure the deployment is public
    'deploy': 'echo "Make the deployment public:" && echo "Vercel Dashboard → your project → Settings → Deployment Protection" && echo "Switch the selector from Standard Protection to Disabled / Public" && vercel --prod'
  }),

  generateFiles: async (config: ProjectConfig) => {
    const files: Record<string, string> = {};

    // Generate a random salt for hashing blob keys
    const salt = crypto.randomBytes(32).toString('hex');

    // Server file
    files['src/server.ts'] = generateServerFile(config);
    
    // Example resource
    files['src/resources/example.ts'] = generateResourceExample(config);
    
    // Vercel config
    files['vercel.json'] = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",

  "buildCommand": "bun run build",
  "outputDirectory": "dist",

  "functions": {
    "api/index.js": {
      "memory": 512,
      "maxDuration": 30
    }
  },
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js",
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Expose-Headers": "WWW-Authenticate"
      }
    }
  ]
}`;

    // API handler for Vercel (JavaScript file that imports the built server)
    files['api/index.js'] = `import app from '../dist/server.js';

export default app;`;

    // Environment variables (inject the salt)
    files['.env'] = generateEnvFile(config, salt);

    // PostgreSQL storage utility
    files['src/storage/postgres-storage.ts'] = generatePostgresStorage();

    // OAuth config if enabled
    if (config.oauth) {
      // Demo users with hashed passwords
      files['src/data/users.ts'] = generateUsersFile();
      files['src/auth/oauth.ts'] = generateOAuthConfig(config);
      // Note: MemoryStorage demo client seed can be done inside oauth.ts template.
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

// Resolve the canonical base URL of this server for both dev and production.
// 1. Use explicit SERVER_URL if provided.
// 2. In Vercel production, VERCEL_URL is automatically injected (without scheme).
// 3. Fallback to localhost when running locally.
const BASE_URL =
  process.env.SERVER_URL ||
  (process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : \`http://localhost:\${process.env.PORT || 3000}\`);

// Create the MCP server (Express version)
const expressApp = createMCPServer({
  name: "${config.name}",
  serverUrl: BASE_URL,
  resources: [exampleResource],${authConfig}
  exposeTypes: true,
  serverMetadata: {
    name: "${config.name}",
    version: "1.0.0",
    description: "${config.description}",
    url: process.env.SERVER_URL || "https://your-vercel-app.vercel.app",
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

// Export for Vercel Functions (Node serverless runtime)
export default expressApp;

// Local development server
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = process.env.PORT || 3000;
  console.log("Starting mcpresso server on port " + port);
  console.log("MCP Inspector URL: http://localhost:" + port);
  
  expressApp.listen(port, () => {
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

function generateEnvFile(config: ProjectConfig, salt: string): string {
  let envContent = `# Environment Variables for ${config.name}
# Copy this file to .env and update the values

# Server Configuration
NODE_ENV=development
PORT=3000
# Base URL of this server. In dev it should match your local port.
SERVER_URL=http://localhost:3000

# In Vercel prod deployments, BASE_URL will resolve automatically from the built-in
# VERCEL_URL env variable, so you normally don’t need to set SERVER_URL manually.
# However you may explicitly set it in the dashboard if you prefer.

# Vercel Configuration
# These will be set automatically by Vercel
# SERVER_URL=https://your-project.vercel.app
`;

  if (config.oauth) {
    envContent += `
# OAuth 2.1 Configuration
# OAUTH_ISSUER will be automatically set to SERVER_URL if not provided
JWT_SECRET=your-secret-key-change-this-in-production

# OAuth Configuration
# Dynamic client registration is used - no pre-configured credentials needed
# Clients are automatically registered when they connect to the server
#
# Storage Setup (for production):
# Set DATABASE_URL to your PostgreSQL connection string
# DATABASE_URL=postgresql://username:password@localhost:5432/mcpresso_oauth
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

function generateBlobKeyUtil(): string {
  return '';
}

function generatePostgresStorage(): string {
  return `import { Pool } from 'pg';
import type { 
  MCPOAuthStorage,
  OAuthClient,
  OAuthUser,
  AuthorizationCode,
  AccessToken,
  RefreshToken
} from 'mcpresso-oauth-server';

export class PostgresStorage implements MCPOAuthStorage {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(\`
        CREATE TABLE IF NOT EXISTS oauth_clients (
          id VARCHAR(255) PRIMARY KEY,
          secret VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          redirect_uris TEXT[] NOT NULL,
          scopes TEXT[] NOT NULL,
          grant_types TEXT[] NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      await client.query(\`
        CREATE TABLE IF NOT EXISTS oauth_users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          hashed_password VARCHAR(255),
          scopes TEXT[] NOT NULL,
          profile JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      await client.query(\`
        CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
          code VARCHAR(255) PRIMARY KEY,
          client_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          redirect_uri VARCHAR(500) NOT NULL,
          scope TEXT[] NOT NULL,
          resource VARCHAR(500),
          code_challenge VARCHAR(255),
          code_challenge_method VARCHAR(10),
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      await client.query(\`
        CREATE TABLE IF NOT EXISTS oauth_access_tokens (
          access_token VARCHAR(255) PRIMARY KEY,
          client_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          scope TEXT[] NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      await client.query(\`
        CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
          refresh_token VARCHAR(255) PRIMARY KEY,
          access_token_id VARCHAR(255) NOT NULL,
          client_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          scope TEXT[] NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      // Create indexes for better performance
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_oauth_clients_id ON oauth_clients(id)
      \`);
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_oauth_users_id ON oauth_users(id)
      \`);
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_oauth_users_username ON oauth_users(username)
      \`);
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_code ON oauth_authorization_codes(code)
      \`);
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token ON oauth_access_tokens(access_token)
      \`);
      await client.query(\`
        CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token ON oauth_refresh_tokens(refresh_token)
      \`);

    } finally {
      client.release();
    }
  }

  // ===== CLIENT MANAGEMENT =====

  async createClient(client: OAuthClient): Promise<void> {
    const query = \`
      INSERT INTO oauth_clients (id, secret, name, type, redirect_uris, scopes, grant_types)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        secret = EXCLUDED.secret,
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        redirect_uris = EXCLUDED.redirect_uris,
        scopes = EXCLUDED.scopes,
        grant_types = EXCLUDED.grant_types,
        updated_at = CURRENT_TIMESTAMP
    \`;
    
    await this.pool.query(query, [
      client.id,
      client.secret,
      client.name,
      client.type,
      client.redirectUris,
      client.scopes,
      client.grantTypes
    ]);
  }

  async getClient(clientId: string): Promise<OAuthClient | null> {
    const result = await this.pool.query(
      'SELECT * FROM oauth_clients WHERE id = $1',
      [clientId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      secret: row.secret,
      name: row.name,
      type: row.type,
      redirectUris: row.redirect_uris,
      scopes: row.scopes,
      grantTypes: row.grant_types,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async listClients(): Promise<OAuthClient[]> {
    const result = await this.pool.query('SELECT * FROM oauth_clients ORDER BY created_at DESC');
    
    return result.rows.map(row => ({
      id: row.id,
      secret: row.secret,
      name: row.name,
      type: row.type,
      redirectUris: row.redirect_uris,
      scopes: row.scopes,
      grantTypes: row.grant_types,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async updateClient(clientId: string, updates: Partial<OAuthClient>): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.secret !== undefined) {
      fields.push(\`secret = $\${paramIndex++}\`);
      values.push(updates.secret);
    }
    if (updates.name !== undefined) {
      fields.push(\`name = $\${paramIndex++}\`);
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push(\`type = $\${paramIndex++}\`);
      values.push(updates.type);
    }
    if (updates.redirectUris !== undefined) {
      fields.push(\`redirect_uris = $\${paramIndex++}\`);
      values.push(updates.redirectUris);
    }
    if (updates.scopes !== undefined) {
      fields.push(\`scopes = $\${paramIndex++}\`);
      values.push(updates.scopes);
    }
    if (updates.grantTypes !== undefined) {
      fields.push(\`grant_types = $\${paramIndex++}\`);
      values.push(updates.grantTypes);
    }

    fields.push(\`updated_at = CURRENT_TIMESTAMP\`);
    values.push(clientId);

    const query = \`UPDATE oauth_clients SET \${fields.join(', ')} WHERE id = $\${paramIndex}\`;
    await this.pool.query(query, values);
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_clients WHERE id = $1', [clientId]);
  }

  // ===== USER MANAGEMENT =====

  async createUser(user: OAuthUser): Promise<void> {
    const query = \`
      INSERT INTO oauth_users (id, username, email, hashed_password, scopes, profile)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        hashed_password = EXCLUDED.hashed_password,
        scopes = EXCLUDED.scopes,
        profile = EXCLUDED.profile,
        updated_at = CURRENT_TIMESTAMP
    \`;
    
    await this.pool.query(query, [
      user.id,
      user.username,
      user.email,
      user.hashedPassword,
      user.scopes,
      user.profile ? JSON.stringify(user.profile) : null
    ]);
  }

  async getUser(userId: string): Promise<OAuthUser | null> {
    const result = await this.pool.query(
      'SELECT * FROM oauth_users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      hashedPassword: row.hashed_password,
      scopes: row.scopes,
      profile: row.profile,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getUserByUsername(username: string): Promise<OAuthUser | null> {
    const result = await this.pool.query(
      'SELECT * FROM oauth_users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      hashedPassword: row.hashed_password,
      scopes: row.scopes,
      profile: row.profile,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async listUsers(): Promise<OAuthUser[]> {
    const result = await this.pool.query('SELECT * FROM oauth_users ORDER BY created_at DESC');
    
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      hashedPassword: row.hashed_password,
      scopes: row.scopes,
      profile: row.profile,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async updateUser(userId: string, updates: Partial<OAuthUser>): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.username !== undefined) {
      fields.push(\`username = $\${paramIndex++}\`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push(\`email = $\${paramIndex++}\`);
      values.push(updates.email);
    }
    if (updates.hashedPassword !== undefined) {
      fields.push(\`hashed_password = $\${paramIndex++}\`);
      values.push(updates.hashedPassword);
    }
    if (updates.scopes !== undefined) {
      fields.push(\`scopes = $\${paramIndex++}\`);
      values.push(updates.scopes);
    }
    if (updates.profile !== undefined) {
      fields.push(\`profile = $\${paramIndex++}\`);
      values.push(updates.profile ? JSON.stringify(updates.profile) : null);
    }

    fields.push(\`updated_at = CURRENT_TIMESTAMP\`);
    values.push(userId);

    const query = \`UPDATE oauth_users SET \${fields.join(', ')} WHERE id = $\${paramIndex}\`;
    await this.pool.query(query, values);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_users WHERE id = $1', [userId]);
  }

  // ===== AUTHORIZATION CODES =====

  async createAuthorizationCode(code: AuthorizationCode): Promise<void> {
    const query = \`
      INSERT INTO oauth_authorization_codes 
      (code, client_id, user_id, redirect_uri, scope, resource, code_challenge, code_challenge_method, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    \`;
    
    await this.pool.query(query, [
      code.code,
      code.clientId,
      code.userId,
      code.redirectUri,
      code.scope,
      code.resource,
      code.codeChallenge,
      code.codeChallengeMethod,
      code.expiresAt
    ]);
  }

  async getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
    const result = await this.pool.query(
      'SELECT * FROM oauth_authorization_codes WHERE code = $1 AND expires_at > CURRENT_TIMESTAMP',
      [code]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      code: row.code,
      clientId: row.client_id,
      userId: row.user_id,
      redirectUri: row.redirect_uri,
      scope: row.scope,
      resource: row.resource,
      codeChallenge: row.code_challenge,
      codeChallengeMethod: row.code_challenge_method,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  async deleteAuthorizationCode(code: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_authorization_codes WHERE code = $1', [code]);
  }

  async cleanupExpiredCodes(): Promise<void> {
    await this.pool.query('DELETE FROM oauth_authorization_codes WHERE expires_at <= CURRENT_TIMESTAMP');
  }

  // ===== ACCESS TOKENS =====

  async createAccessToken(token: AccessToken): Promise<void> {
    const query = \`
      INSERT INTO oauth_access_tokens 
      (access_token, client_id, user_id, scope, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    \`;
    
    await this.pool.query(query, [
      token.token,
      token.clientId,
      token.userId,
      token.scope,
      token.expiresAt
    ]);
  }

  async getAccessToken(token: string): Promise<AccessToken | null> {
    const result = await this.pool.query(
      'SELECT * FROM oauth_access_tokens WHERE access_token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      token: row.access_token,
      clientId: row.client_id,
      userId: row.user_id,
      scope: row.scope,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  async deleteAccessToken(token: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_access_tokens WHERE access_token = $1', [token]);
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.pool.query('DELETE FROM oauth_access_tokens WHERE expires_at <= CURRENT_TIMESTAMP');
  }

  // ===== REFRESH TOKENS =====

  async createRefreshToken(token: RefreshToken): Promise<void> {
    const query = \`
      INSERT INTO oauth_refresh_tokens 
      (refresh_token, access_token_id, client_id, user_id, scope, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    \`;
    
    await this.pool.query(query, [
      token.token,
      token.accessTokenId,
      token.clientId,
      token.userId,
      token.scope,
      token.expiresAt
    ]);
  }

  async getRefreshToken(token: string): Promise<RefreshToken | null> {
    const result = await this.pool.query(
      'SELECT * FROM oauth_refresh_tokens WHERE refresh_token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      token: row.refresh_token,
      accessTokenId: row.access_token_id,
      clientId: row.client_id,
      userId: row.user_id,
      scope: row.scope,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_refresh_tokens WHERE refresh_token = $1', [token]);
  }

  async deleteRefreshTokensByAccessToken(accessTokenId: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_refresh_tokens WHERE access_token_id = $1', [accessTokenId]);
  }

  async cleanupExpiredRefreshTokens(): Promise<void> {
    await this.pool.query('DELETE FROM oauth_refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP');
  }

  // ===== UTILITY METHODS =====

  getStats(): { clients: number; users: number; authorizationCodes: number; accessTokens: number; refreshTokens: number } {
    // Note: This is a synchronous method that returns cached stats
    // For real-time stats, you would need to implement a separate async method
    return {
      clients: 0, // Would need to be implemented with caching
      users: 0,
      authorizationCodes: 0,
      accessTokens: 0,
      refreshTokens: 0
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}`;
}

function generateOAuthConfig(config: ProjectConfig): string {
  return `import { MCPOAuthServer } from "mcpresso-oauth-server";
import { MemoryStorage } from "mcpresso-oauth-server";
import { PostgresStorage } from "../storage/postgres-storage.js";
import * as bcrypt from "bcryptjs";
import { demoUsers } from "../data/users.js";

// Resolve base URL (same logic as in server.ts)
const BASE_URL =
  process.env.SERVER_URL ||
  (process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : \`http://localhost:\${process.env.PORT || 3000}\`);

// Create storage for OAuth data
// Local development: Memory storage (lifetime of process)
// Vercel production: PostgreSQL storage
let storage: any;

// Check if we're in Vercel environment and have a database URL
if (process.env.VERCEL && process.env.DATABASE_URL) {
  // Use PostgreSQL as the persistent store in production
  try {
    storage = new PostgresStorage(process.env.DATABASE_URL);
    await storage.initialize();
    console.log('✅ Using PostgreSQL storage for OAuth data');
  } catch (error) {
    console.warn('PostgreSQL not available, falling back to MemoryStorage:', error);
    storage = new MemoryStorage();
  }
} else {
  // Local development uses in-memory storage
  storage = new MemoryStorage();
}

// Pre-seed the storage with demo users
(async () => {
  try {
    for (const user of demoUsers) {
      await storage.createUser(user);
    }
  } catch (error) {
    // Users might already exist, ignore error
  }
})();

// MCP auth configuration with integrated OAuth server
export const oauthConfig = {
  oauth: new MCPOAuthServer({
    issuer: BASE_URL,
    serverUrl: BASE_URL,
    jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-this",
    allowDynamicClientRegistration: true,
    supportedScopes: ["read", "write"],
    supportedGrantTypes: ["authorization_code"],
    auth: {
      authenticateUser: async (credentials: { username: string; password: string }) => {
        const found = demoUsers.find((u) => u.email === credentials.username);
        if (!found) return null;
        const ok = await bcrypt.compare(credentials.password, found.hashedPassword);
        return ok ? found : null;
      },
      renderLoginPage: async (context: { clientId: string; redirectUri: string; scope?: string; resource?: string }, error?: string) => {
        const errorHtml = error ? \`<div class="error">\${error}</div>\` : "";
        return \`<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${config.name} – Sign in</title>
      <style>
        :root { --primary:#2563eb; --bg:#f9fafb; --card-bg:#ffffff; --border:#e5e7eb; --radius:8px; --font:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif; }
        * { box-sizing:border-box; }
        body { margin:0; font-family:var(--font); background:var(--bg); display:flex; align-items:center; justify-content:center; height:100vh; }
        .card { width:100%; max-width:420px; background:var(--card-bg); padding:32px 40px; border:1px solid var(--border); border-radius:var(--radius); box-shadow:0 4px 24px rgba(0,0,0,0.05); }
        h1 { margin-top:0; margin-bottom:24px; font-size:24px; text-align:center; }
        .form-group { margin-bottom:20px; }
        label { display:block; margin-bottom:6px; font-size:14px; color:#374151; }
        input { width:100%; padding:12px; font-size:16px; border:1px solid var(--border); border-radius:var(--radius); }
        button { width:100%; padding:12px; font-size:16px; border:none; border-radius:var(--radius); background:var(--primary); color:#fff; cursor:pointer; transition:background 0.2s ease; }
        button:hover { background:#1e4dd8; }
        .error { background:#fee2e2; color:#b91c1c; padding:12px; border-radius:var(--radius); margin-bottom:16px; text-align:center; }
      </style>
    </head>
    <body>
      <form class="card" method="POST" action="/authorize">
        <h1>Sign in to ${config.name}</h1>
        \${errorHtml}
        <input type="hidden" name="response_type" value="code" />
        <input type="hidden" name="client_id" value="\${context.clientId}" />
        <input type="hidden" name="redirect_uri" value="\${context.redirectUri}" />
        <input type="hidden" name="scope" value="\${context.scope || ""}" />
        <input type="hidden" name="resource" value="\${context.resource || ""}" />

        <div class="form-group">
          <label for="username">Email</label>
          <input type="email" id="username" name="username" required placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required placeholder="••••••••" />
        </div>
        <button type="submit">Continue</button>
      </form>
    </body>
  </html>\`;
      },
    },
  }, storage),
  serverUrl: BASE_URL,
  userLookup: async (jwt: { sub: string }) => {
    const u = demoUsers.find((x) => x.id === jwt.sub);
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      email: u.email || "",
      scopes: u.scopes,
      profile: u.profile,
    };
  },
};`;
}

function generateUsersFile(): string {
  return `import { hashSync } from "bcryptjs";
import type { OAuthUser } from "mcpresso-oauth-server";

export interface DemoUser extends OAuthUser {
  hashedPassword: string;
  profile: {
    name: string;
    role: string;
    department: string;
  };
}

// Passwords: alice@example.com => alice123, bob@example.com => bob123
export const demoUsers: DemoUser[] = [
  {
    id: "user-1",
    username: "alice@example.com",
    email: "alice@example.com",
    hashedPassword: hashSync("alice123", 10),
    scopes: ["read", "write"],
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: { name: "Alice", role: "Engineer", department: "Engineering" },
  },
  {
    id: "user-2",
    username: "bob@example.com",
    email: "bob@example.com",
    hashedPassword: hashSync("bob123", 10),
    scopes: ["read"],
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: { name: "Bob", role: "Marketer", department: "Marketing" },
  },
];`;
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

 