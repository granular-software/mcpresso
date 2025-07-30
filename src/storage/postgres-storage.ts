import { Pool, PoolClient } from 'pg';
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
      await client.query(`
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
      `);

      await client.query(`
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
      `);

      await client.query(`
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
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS oauth_access_tokens (
          access_token VARCHAR(255) PRIMARY KEY,
          client_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          scope TEXT[] NOT NULL,
          resource VARCHAR(500),
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
          refresh_token VARCHAR(255) PRIMARY KEY,
          access_token_id VARCHAR(255) NOT NULL,
          client_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          scope TEXT[] NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_clients_id ON oauth_clients(id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_users_id ON oauth_users(id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_users_username ON oauth_users(username)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_code ON oauth_authorization_codes(code)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token ON oauth_access_tokens(access_token)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token ON oauth_refresh_tokens(refresh_token)
      `);

    } finally {
      client.release();
    }
  }

  // ===== CLIENT MANAGEMENT =====

  async createClient(client: OAuthClient): Promise<void> {
    const query = `
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
    `;
    
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
      fields.push(`secret = $${paramIndex++}`);
      values.push(updates.secret);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.redirectUris !== undefined) {
      fields.push(`redirect_uris = $${paramIndex++}`);
      values.push(updates.redirectUris);
    }
    if (updates.scopes !== undefined) {
      fields.push(`scopes = $${paramIndex++}`);
      values.push(updates.scopes);
    }
    if (updates.grantTypes !== undefined) {
      fields.push(`grant_types = $${paramIndex++}`);
      values.push(updates.grantTypes);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(clientId);

    const query = `UPDATE oauth_clients SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    await this.pool.query(query, values);
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_clients WHERE id = $1', [clientId]);
  }

  // ===== USER MANAGEMENT =====

  async createUser(user: OAuthUser): Promise<void> {
    const query = `
      INSERT INTO oauth_users (id, username, email, hashed_password, scopes, profile)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        hashed_password = EXCLUDED.hashed_password,
        scopes = EXCLUDED.scopes,
        profile = EXCLUDED.profile,
        updated_at = CURRENT_TIMESTAMP
    `;
    
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
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.hashedPassword !== undefined) {
      fields.push(`hashed_password = $${paramIndex++}`);
      values.push(updates.hashedPassword);
    }
    if (updates.scopes !== undefined) {
      fields.push(`scopes = $${paramIndex++}`);
      values.push(updates.scopes);
    }
    if (updates.profile !== undefined) {
      fields.push(`profile = $${paramIndex++}`);
      values.push(updates.profile ? JSON.stringify(updates.profile) : null);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `UPDATE oauth_users SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    await this.pool.query(query, values);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM oauth_users WHERE id = $1', [userId]);
  }

  // ===== AUTHORIZATION CODES =====

  async createAuthorizationCode(code: AuthorizationCode): Promise<void> {
    const query = `
      INSERT INTO oauth_authorization_codes 
      (code, client_id, user_id, redirect_uri, scope, resource, code_challenge, code_challenge_method, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
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
    const query = `
      INSERT INTO oauth_access_tokens 
      (access_token, client_id, user_id, scope, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
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
    const query = `
      INSERT INTO oauth_refresh_tokens 
      (refresh_token, access_token_id, client_id, user_id, scope, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
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
} 