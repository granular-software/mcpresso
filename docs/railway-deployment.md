# Railway Deployment Guide

## Overview

Railway is a modern platform for deploying full-stack applications with built-in PostgreSQL databases. This guide covers deploying your mcpresso MCP server to Railway with automatic database setup and user management.

## Quick Start

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Create and Deploy

```bash
# Create a new project
mcpresso init my-oauth-app --template railway --oauth

# Navigate to project
cd my-oauth-app

# Deploy to Railway
mcpresso deploy
```

## Features

- ✅ **Automatic PostgreSQL Setup** - Database created and configured automatically
- ✅ **User Management** - Demo users (alice@example.com, bob@example.com) created in database
- ✅ **OAuth 2.1 Support** - Full OAuth flow with PKCE
- ✅ **Production Ready** - SSL, CORS, rate limiting, security headers
- ✅ **Global CDN** - Fast worldwide access
- ✅ **Git Integration** - Automatic deployments from Git

## Architecture

```
┌─────────────────────────────────┐
│         Railway Project         │
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │
│ │   Web App   │ │ PostgreSQL  │ │
│ │   Service   │ │   Database  │ │
│ │             │ │             │ │
│ │ • MCP API   │ │ • OAuth     │ │
│ │ • OAuth     │ │   Data      │ │
│ │ • Users     │ │ • Users     │ │
│ │ • Tokens    │ │ • Clients   │ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────┘
```

## Deployment Process

### Automatic Setup

The CLI automatically:

1. **Creates Railway Project** - Initializes new Railway project
2. **Adds PostgreSQL** - Creates and configures database
3. **Sets Environment Variables** - Configures DATABASE_URL automatically
4. **Deploys Application** - Builds and deploys your app
5. **Creates Demo Data** - Sets up demo users and OAuth client

### Manual Steps

If you prefer manual setup:

```bash
# 1. Create Railway project
railway init

# 2. Add PostgreSQL database
railway add postgresql

# 3. Link your project
railway link

# 4. Deploy
railway up
```

## Environment Variables

Railway automatically sets these environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `RAILWAY_STATIC_URL` - Your app's public URL
- `PORT` - Application port (usually 3000)

You can add custom variables in Railway dashboard or via CLI:

```bash
railway variables set JWT_SECRET=your-secure-secret
railway variables set ALLOWED_ORIGINS=https://yourdomain.com
```

## Database Schema

The PostgreSQL database automatically creates these tables:

### OAuth Tables
- `oauth_clients` - OAuth client registrations
- `oauth_users` - User accounts and profiles
- `oauth_authorization_codes` - Authorization codes for PKCE flow
- `oauth_access_tokens` - Access tokens
- `oauth_refresh_tokens` - Refresh tokens

### Demo Data

The system automatically creates:

**Demo Users:**
- `alice@example.com` / `alice123` (read, write scopes)
- `bob@example.com` / `bob123` (read scope)

**Demo OAuth Client:**
- Client ID: `demo-client`
- Secret: `demo-secret`
- Redirect URIs: Local development URLs

## Authentication

### OAuth 2.1 Flow

1. **Client Registration** - Dynamic client registration (RFC 7591)
2. **Authorization** - PKCE flow with resource indicators
3. **Token Exchange** - Authorization code for access token
4. **Resource Access** - Use access token for API calls

### Bearer Token

Simple token-based authentication for internal APIs:

```bash
curl -H "Authorization: Bearer sk-1234567890abcdef" \
  https://your-app.railway.app/api/resources
```

## API Endpoints

### Health Check
```
GET /health
```

### MCP Discovery
```
GET /.well-known/mcp
```

### OAuth Endpoints (if enabled)
```
POST /authorize
POST /token
GET  /userinfo
POST /introspect
POST /revoke
GET  /.well-known/oauth-authorization-server
```

### API Documentation
```
GET /docs
```

## Development vs Production

### Local Development
- Uses in-memory storage
- Demo users hardcoded in code
- No database required
- Fast startup and testing

### Railway Production
- Uses PostgreSQL for persistence
- Demo users stored in database
- Automatic database setup
- Production-ready security

## Monitoring and Logs

### View Logs
```bash
railway logs
```

### Monitor Performance
```bash
railway status
```

### Database Access
```bash
railway connect postgresql
```

## Troubleshooting

### Common Issues

**1. Railway CLI not authenticated**
```bash
railway login
```

**2. Project not linked**
```bash
railway link
# or
railway init
```

**3. Database connection failed**
```bash
# Check if PostgreSQL service exists
railway service list

# Add PostgreSQL if missing
railway add postgresql
```

**4. Build failed**
```bash
# Check build logs
railway logs

# Verify package.json and dependencies
bun install
```

### Performance Optimization

1. **Connection Pooling** - PostgreSQL connections are pooled
2. **Indexes** - Automatic database indexes for performance
3. **Caching** - Consider adding Redis for session caching
4. **CDN** - Railway provides global CDN automatically

### Security Best Practices

1. **Environment Variables** - Never commit secrets to Git
2. **JWT Secrets** - Use strong, random secrets in production
3. **CORS** - Configure allowed origins properly
4. **Rate Limiting** - Already configured in the template
5. **SSL** - Automatic SSL in production

## Migration from Other Platforms

### From Vercel
1. Export your data from Vercel
2. Create new Railway project
3. Import data to Railway PostgreSQL
4. Update environment variables
5. Deploy to Railway

### From Heroku
1. Use Railway's Heroku migration tool
2. Update database connection strings
3. Deploy with Railway CLI

## Cost Optimization

Railway pricing:
- **Free Tier**: $5/month credit
- **Web Service**: ~$5/month
- **PostgreSQL**: ~$5/month
- **Total**: ~$10/month for full setup

## Support

- **Railway Docs**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **mcpresso Issues**: GitHub repository

## Example Deployment

```bash
# 1. Create project
mcpresso init my-oauth-api --template railway --oauth

# 2. Navigate to project
cd my-oauth-api

# 3. Deploy
mcpresso deploy

# 4. Get your URL
railway status

# 5. Test OAuth flow
curl https://your-app.railway.app/.well-known/oauth-authorization-server
```

Your OAuth server will be live at `https://your-app.railway.app` with full PostgreSQL database and demo users ready to use! 