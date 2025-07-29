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

The CLI will automatically attempt to set up Vercel KV during deployment:

```bash
bun run mcpresso deploy
```

This will:
1. Check if Vercel KV exists
2. Create it if it doesn't exist
3. Link it to your project
4. Deploy your application

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