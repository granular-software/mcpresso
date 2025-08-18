# Docker Template

mcpresso provides Docker templates for easy deployment and containerization of your MCP servers.

## Available Docker Templates

### 1. Docker + OAuth2.1 + PostgreSQL
Production-ready template with OAuth2.1 authentication and PostgreSQL database.

**Features:**
- Full OAuth2.1 authentication flow
- PostgreSQL database with migrations
- Docker Compose setup
- Production-ready configuration
- Health checks and monitoring

**Best for:** Production deployments, enterprise applications, multi-user systems

### 2. Docker + Single User (API Key)
Simple Docker template for single-user applications with API key authentication.

**Features:**
- API key authentication (no database required)
- Lightweight container
- Simple configuration
- Quick deployment

**Best for:** Single-user applications, internal tools, development environments

## Quick Start with Docker

### 1. Create Project
```bash
npx mcpresso init my-docker-server --template template-docker-oauth-postgresql
cd my-docker-server
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup Database and Authentication
```bash
# Generate JWT secret
npm run secret:generate

# Initialize database (interactive setup)
npm run db:init

# Create a test user
npm run user:create "John Doe" "john@example.com" "strongpassword"
```

### 4. Start with Docker Compose
```bash
docker-compose up -d
```

### 5. Access Your Server
- MCP Server: http://localhost:3000
- OAuth Authorization: http://localhost:3000/authorize
- Health Check: http://localhost:3000/health

## Database Initialization

Before starting your Docker containers, you must initialize the database and generate a JWT secret.

### JWT Secret Generation

The JWT secret is used to sign authentication tokens. Generate a secure secret:

```bash
# Using the provided script (recommended)
npm run secret:generate

# This script:
# - Generates a 64-byte random secret using openssl
# - Updates your .env file automatically
# - Warns if replacing an existing secret
```

### Database Setup

The template includes a comprehensive database initialization script:

```bash
# Interactive setup (recommended)
npm run db:init

# This script:
# - Prompts for DATABASE_URL if not set
# - Creates all necessary tables and indexes
# - Sets up OAuth client registry
# - Creates database functions and triggers
```

The initialization creates these tables:
- **users** - User accounts with authentication
- **oauth_clients** - OAuth client registry
- **oauth_authorization_codes** - Authorization codes
- **oauth_access_tokens** - Access tokens
- **oauth_refresh_tokens** - Refresh tokens
- **notes** - Example resource with author relationships

### Create Test Users

After database initialization, create test users:

```bash
# Create a test user
npm run user:create "John Doe" "john@example.com" "strongpassword"

# The script:
# - Validates email uniqueness
# - Hashes passwords securely
# - Creates user with default scopes
```

## Docker Template Structure

```
my-docker-server/
├── Dockerfile                 # Container definition
├── docker-compose.yml         # Multi-service setup
├── .env.example              # Environment variables template
├── scripts/                   # Database initialization scripts
│   ├── init-db.js           # Database setup
│   └── generate-secret.sh   # Secret generation
├── src/                      # Application source code
│   ├── server.ts            # Main server file
│   ├── resources/           # MCP resources
│   └── storage/             # Database storage layer
└── package.json              # Dependencies and scripts
```

## Docker Compose Configuration

### Basic Setup
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db
    volumes:
      - ./data:/app/data

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Production Configuration
```yaml
version: '3.8'
services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OAUTH_ISSUER=${OAUTH_ISSUER}
    depends_on:
      - db
    networks:
      - app_network

  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app_network

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
```

## Dockerfile

### Basic Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["pnpm", "start"]
```

### Multi-stage Build
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

## Environment Variables

### Required Variables
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
SERVER_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production
OAUTH_ISSUER=http://localhost:3000
```

### Optional Variables
```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Retry Configuration
RETRY_ATTEMPTS=3
RETRY_FACTOR=2
RETRY_MIN_TIMEOUT=1000
RETRY_MAX_TIMEOUT=10000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Deployment Commands

### Development
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

## Health Checks

### Application Health
```ts
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### Database Health
```ts
app.get('/health/db', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});
```

## Monitoring and Logging

### Logging Configuration
```ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics Collection
```ts
import prometheus from 'prom-client';

// Collect default metrics
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

## Available NPM Scripts

The template includes several useful scripts:

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run typecheck       # Type check without building

# Database and Authentication
npm run db:init         # Interactive database setup
npm run secret:generate # Generate secure JWT secret
npm run user:create     # Create new user account

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container
```

## Best Practices

1. **Use multi-stage builds** - Reduce final image size
2. **Set health checks** - Enable container orchestration
3. **Use environment variables** - Keep configuration flexible
4. **Implement logging** - Monitor application health
5. **Set resource limits** - Prevent resource exhaustion
6. **Use secrets management** - Secure sensitive data
7. **Regular updates** - Keep base images current

## Complete Examples

- **Docker + OAuth + PostgreSQL**: [Template Repository](https://github.com/granular-software/mcpresso/tree/main/templates/template-docker-oauth-postgresql)
- **Docker + Single User**: [Template Repository](https://github.com/granular-software/mcpresso/tree/main/templates/template-docker-single-user) 