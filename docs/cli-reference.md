# CLI Reference

The mcpresso CLI provides tools for managing your MCP servers.

## Commands

### `mcpresso init`
Creates a new mcpresso project with interactive prompts.

**Options:**
- `-y, --yes` - Skip prompts and use defaults
- `-t, --template <template>` - Template ID to use
- `-n, --name <name>` - Project name
- `-d, --description <description>` - Project description

**Examples:**
```bash
# Interactive setup
mcpresso init

# Quick setup with specific template
mcpresso init --template template-express-no-auth --name my-api --yes

# Custom GitHub template
mcpresso init --template https://github.com/user/custom-template.git
```

### `mcpresso list`
Lists all available templates.

**Examples:**
```bash
# List all templates
mcpresso list

# Filter by category
mcpresso list --category express
```

### `mcpresso info <template-id>`
Shows detailed information about a specific template.

**Examples:**
```bash
# Get template details
mcpresso info template-docker-oauth-postgresql

# Get info by URL
mcpresso info https://github.com/user/custom-template.git
```

### `mcpresso dev`
Starts the development server with hot reload.

**Options:**
- `-p, --port <port>` - Port to run on (default: 3000)
- `-h, --host <host>` - Host to bind to (default: localhost)

**Examples:**
```bash
# Default development server
mcpresso dev

# Custom port
mcpresso dev -p 4000

# Custom host
mcpresso dev -h 0.0.0.0
```

### `mcpresso build`
Builds the project for production.

**Options:**
- `--clean` - Clean build directory before building

**Examples:**
```bash
# Standard build
mcpresso build

# Clean build
mcpresso build --clean
```

## Installation

### Global Installation
```bash
npm install -g mcpresso
```

### Using npx (Recommended)
```bash
npx mcpresso init
```

No installation required - npx will download and run the latest version. 