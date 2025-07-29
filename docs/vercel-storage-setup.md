# Vercel Storage Setup for OAuth

## Overview

The OAuth server needs persistent storage to maintain client registrations, users, and tokens across server restarts. In Vercel's serverless environment, we need to use Vercel's storage services.

## Quick Setup

### Option 1: Vercel KV (Recommended)

1. **Create KV Database:**
   ```bash
   vercel kv create mcpresso-oauth
   ```

2. **Link to Project:**
   ```bash
   vercel kv link mcpresso-oauth
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Postgres

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

## Automatic Setup

The CLI provides guidance during deployment:

```bash
# Create and deploy your project
bun run mcpresso init my-oauth-app --template vercel --oauth --yes
cd my-oauth-app
bun run mcpresso deploy
```

This will:
1. Deploy your application with memory storage
2. Provide instructions for setting up persistent storage
3. Automatically use Vercel KV when available
4. Work seamlessly in both local and production environments

## Manual Storage Implementation

If you want to implement your own storage, update `src/auth/oauth.ts`:

```typescript
// Replace MemoryStorage with your implementation
class VercelKVStorage extends MemoryStorage {
  // Implement KV storage methods
}

const storage = new VercelKVStorage();
```

## Development vs Production

- **Development**: Uses `MemoryStorage` (in-memory, no persistence)
- **Production**: Should use `VercelKVStorage` or `VercelPostgresStorage`

## Environment Variables

The following environment variables will be automatically set by Vercel:

- `KV_URL` - Vercel KV connection string
- `POSTGRES_URL` - Vercel Postgres connection string

## Troubleshooting

### "Invalid redirect URI" Error

This usually means:
1. Dynamic client registration is working
2. But the server isn't persisting the registered clients
3. Solution: Set up Vercel KV or Postgres storage

### Storage Not Working

1. Check if KV/Postgres is linked to your project
2. Verify environment variables are set
3. Check Vercel dashboard for storage status 