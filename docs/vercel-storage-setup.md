# Vercel Storage Setup for OAuth

## Overview

The OAuth server needs persistent storage to maintain client registrations, users, and tokens across server restarts. In Vercel's serverless environment, we use PostgreSQL for persistent storage.

## Quick Setup

### Option 1 (Recommended): Vercel Postgres

1. **Create Postgres Database:**
   ```bash
   vercel postgres create
   ```

2. **Link to Project:**
   ```bash
   vercel postgres link
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: External PostgreSQL

1. **Set up external PostgreSQL database** (e.g., Supabase, Railway, Neon)
2. **Set DATABASE_URL environment variable** in Vercel dashboard
3. **Deploy:**
   ```bash
   vercel --prod
   ```

## Automatic Setup

The CLI automatically sets up PostgreSQL during deployment:

```bash
# Create and deploy your project
bun run mcpresso init my-oauth-app --template vercel --oauth --yes
cd my-oauth-app
bun run mcpresso deploy
```

This will:
1. Prompt for PostgreSQL connection string
2. Set up DATABASE_URL environment variable
3. Deploy your application
4. Use PostgreSQL storage in production automatically

## Storage Implementation

The generated code automatically detects the environment:

**Local Development:**
- Uses `MemoryStorage` (lifetime of process)
- No external dependencies
- Fast and simple

**Vercel Production:**
- Uses `PostgresStorage` with PostgreSQL
- Automatically detects DATABASE_URL environment variable
- Falls back to memory if PostgreSQL unavailable
- Persistent storage across deployments

## Manual Storage Implementation

If you want to implement your own storage, update `src/auth/oauth.ts`:

```typescript
// Replace MemoryStorage with your implementation
class CustomPostgresStorage extends PostgresStorage {
  // Implement custom storage methods
}

const storage = new CustomPostgresStorage(process.env.DATABASE_URL);
```

## Development vs Production

- **Development**: Uses `MemoryStorage` (in-memory, no persistence)
- **Production**: Should use `PostgresStorage` with PostgreSQL

## Environment Variables

The following environment variables will be automatically set by Vercel:

- `DATABASE_URL`: PostgreSQL connection string
- `VERCEL`: Set to "1" in Vercel environment
- `VERCEL_URL`: Your deployment URL

## Database Schema

The PostgreSQL storage automatically creates the following tables:

- `oauth_clients`: OAuth client registrations
- `oauth_users`: User accounts and profiles
- `oauth_authorization_codes`: Authorization codes for PKCE flow
- `oauth_access_tokens`: Access tokens
- `oauth_refresh_tokens`: Refresh tokens

## Troubleshooting

### Connection Issues

If you see "PostgreSQL not available" errors:

1. **Check DATABASE_URL**: Ensure it's set in Vercel dashboard
2. **Verify connection**: Test the connection string locally
3. **SSL settings**: Production requires SSL, development may not

### Performance

For high-traffic applications:

1. **Connection pooling**: The storage uses connection pooling
2. **Indexes**: Automatic indexes are created for performance
3. **Cleanup**: Expired tokens are automatically cleaned up

### Migration from Blob Storage

If migrating from the old blob storage:

1. **Export data**: Export any existing OAuth data
2. **Set up PostgreSQL**: Create new PostgreSQL database
3. **Update environment**: Set DATABASE_URL
4. **Redeploy**: Deploy with new storage 