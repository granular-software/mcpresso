#!/bin/bash

# Development Template Creation Script for mcpresso CLI
# This script creates a template locally for testing without GitHub integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEMPLATE_PREFIX="template-"
MAIN_REPO_PATH="/Users/arthurhirel/Documents/joshu/joshu"
MCPRESSO_PATH="$MAIN_REPO_PATH/packages/mcpresso"

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to get template configuration
get_template_config() {
    echo "Enter template configuration:"
    echo ""
    
    read -p "Template ID (e.g., express-jwt-memory): " TEMPLATE_ID
    read -p "Template Name (e.g., Express + JWT + Memory): " TEMPLATE_NAME
    read -p "Template Description: " TEMPLATE_DESCRIPTION
    read -p "Category (express/docker/cloud): " TEMPLATE_CATEGORY
    read -p "Auth Type (oauth/token/none): " TEMPLATE_AUTH_TYPE
    read -p "Complexity (easy/medium/hard): " TEMPLATE_COMPLEXITY
    
    # Validate inputs
    if [[ -z "$TEMPLATE_ID" || -z "$TEMPLATE_NAME" || -z "$TEMPLATE_DESCRIPTION" ]]; then
        print_error "All fields are required"
        exit 1
    fi
    
    # Set default values if empty
    TEMPLATE_CATEGORY=${TEMPLATE_CATEGORY:-express}
    TEMPLATE_AUTH_TYPE=${TEMPLATE_AUTH_TYPE:-none}
    TEMPLATE_COMPLEXITY=${TEMPLATE_COMPLEXITY:-easy}
    
    # Create full template ID
    FULL_TEMPLATE_ID="${TEMPLATE_PREFIX}${TEMPLATE_ID}"
}

# Function to generate template files
generate_template_files() {
    print_status "Generating template files..."
    
    local template_dir="$MAIN_REPO_PATH/apps/$FULL_TEMPLATE_ID"
    mkdir -p "$template_dir"
    cd "$template_dir"
    
    # Create template.json
    cat > template.json << EOF
{
  "name": "$TEMPLATE_NAME",
  "description": "$TEMPLATE_DESCRIPTION",
  "version": "1.0.0",
  "mcpressoVersion": "^0.7.0",
  "category": "$TEMPLATE_CATEGORY",
  "authType": "$TEMPLATE_AUTH_TYPE",
  "complexity": "$TEMPLATE_COMPLEXITY",
  "features": [
    "MCP server",
    "TypeScript",
    "Production ready"
  ],
  "requirements": [
    "Node.js 18+",
    "npm or yarn"
  ],
  "envVars": [
    {
      "name": "PORT",
      "description": "Server port",
      "required": false,
      "default": "3000"
    },
    {
      "name": "SERVER_URL",
      "description": "Base URL of your server",
      "required": true
    }
  ]
}
EOF

    # Create package.json
    cat > package.json << EOF
{
  "name": "$FULL_TEMPLATE_ID",
  "version": "1.0.0",
  "description": "{{PROJECT_DESCRIPTION}}",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "mcpresso": "^0.7.7",
    "zod": "^3.23.8",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  },
  "keywords": [
    "mcp",
    "mcpresso",
    "express",
    "api"
  ],
  "author": "",
  "license": "MIT"
}
EOF

    # Create README.md
    cat > README.md << EOF
# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Quick Start

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**
   \`\`\`bash
   cp env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Build for production**
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

## Features

- MCP server with Express.js
- TypeScript support
- Development and production builds
- Environment variable configuration

## Project Structure

\`\`\`
src/
├── server.ts          # Main server file
└── resources/         # MCP resources
    └── example.ts     # Example resource
\`\`\`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3000 |
| SERVER_URL | Base URL of your server | Yes | - |

## Development

- \`npm run dev\` - Start development server with hot reload
- \`npm run build\` - Build for production
- \`npm run typecheck\` - Type check without building

## License

MIT
EOF

    # Create .env.example
    cat > env.example << EOF
# Server Configuration
PORT=3000
SERVER_URL=http://localhost:3000

# Add your custom environment variables below
EOF

    # Create .gitignore
    cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
EOF

    # Create tsconfig.json
    cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF

    # Create src directory and files
    mkdir -p src/resources

    # Create server.ts
    cat > src/server.ts << EOF
import { createServer } from 'mcpresso';
import { z } from 'zod';
import express from 'express';
import { notesResource } from './resources/example.js';

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create MCP server
const server = createServer({
  name: '{{PROJECT_NAME}}',
  version: '1.0.0',
  resources: [notesResource]
});

// Start server
server.listen(port, () => {
  console.log(\`🚀 Server running on http://localhost:\${port}\`);
  console.log(\`📊 Health check: http://localhost:\${port}/health\`);
});
EOF

    # Create example resource
    cat > src/resources/example.ts << EOF
import { Resource } from 'mcpresso';
import { z } from 'zod';

// In-memory storage for demo
const notes = new Map<string, { id: string; title: string; content: string; createdAt: string }>();

// Note schema
const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string()
});

export const notesResource: Resource = {
  name: 'notes',
  description: 'Simple notes management',
  schema: NoteSchema,
  
  // List all notes
  list: async () => {
    return Array.from(notes.values());
  },
  
  // Get a specific note
  get: async (id: string) => {
    const note = notes.get(id);
    if (!note) {
      throw new Error(\`Note with id \${id} not found\`);
    }
    return note;
  },
  
  // Create a new note
  create: async (data: { title: string; content: string }) => {
    const id = Date.now().toString();
    const note = {
      id,
      title: data.title,
      content: data.content,
      createdAt: new Date().toISOString()
    };
    notes.set(id, note);
    return note;
  },
  
  // Update a note
  update: async (id: string, data: Partial<{ title: string; content: string }>) => {
    const note = notes.get(id);
    if (!note) {
      throw new Error(\`Note with id \${id} not found\`);
    }
    
    const updatedNote = { ...note, ...data };
    notes.set(id, updatedNote);
    return updatedNote;
  },
  
  // Delete a note
  delete: async (id: string) => {
    const note = notes.get(id);
    if (!note) {
      throw new Error(\`Note with id \${id} not found\`);
    }
    notes.delete(id);
    return { success: true };
  },
  
  // Search notes
  search: async (query: string) => {
    const results = Array.from(notes.values()).filter(note =>
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content.toLowerCase().includes(query.toLowerCase())
    );
    return results;
  }
};
EOF

    print_success "Template files generated"
}

# Function to update CLI template manager for local development
update_cli_template_manager_dev() {
    print_status "Updating CLI template manager for local development..."
    
    local template_manager_file="$MCPRESSO_PATH/src/cli/utils/template-manager.ts"
    
    # Create backup
    cp "$template_manager_file" "$template_manager_file.backup"
    
    # Add new template to OFFICIAL_TEMPLATES array
    local template_entry="  {
    id: '$FULL_TEMPLATE_ID',
    name: '$TEMPLATE_NAME',
    description: '$TEMPLATE_DESCRIPTION',
    category: '$TEMPLATE_CATEGORY',
    authType: '$TEMPLATE_AUTH_TYPE',
    complexity: '$TEMPLATE_COMPLEXITY',
    url: 'file://$MAIN_REPO_PATH/apps/$FULL_TEMPLATE_ID',
    features: [
      'MCP server',
      'TypeScript',
      'Production ready'
    ],
    requirements: [
      'Node.js 18+',
      'npm or yarn'
    ],
    envVars: [
      { name: 'PORT', description: 'Server port', required: false, default: '3000' },
      { name: 'SERVER_URL', description: 'Base URL of your server', required: true }
    ]
  }"
    
    # Find the position to insert (before the closing bracket of OFFICIAL_TEMPLATES array)
    local insert_line=$(grep -n "];" "$template_manager_file" | head -1 | cut -d: -f1)
    
    # Create a temporary file with the new template entry
    local temp_file=$(mktemp)
    head -n $((insert_line - 1)) "$template_manager_file" > "$temp_file"
    echo "$template_entry" >> "$temp_file"
    tail -n +$insert_line "$template_manager_file" >> "$temp_file"
    
    # Replace the original file
    mv "$temp_file" "$template_manager_file"
    
    print_success "CLI template manager updated for local development"
}

# Function to build and test CLI
build_and_test_cli() {
    print_status "Building and testing CLI..."
    
    cd "$MCPRESSO_PATH"
    npm run build
    
    # Test the CLI
    if node dist/cli/index.js list | grep -q "$TEMPLATE_NAME"; then
        print_success "CLI build successful and template is listed"
    else
        print_warning "Template might not appear in list immediately"
    fi
}

# Main function
main() {
    echo -e "${BLUE}🚀 mcpresso Development Template Creation Script${NC}"
    echo "====================================================="
    echo ""
    
    # Get template configuration
    get_template_config
    
    echo ""
    echo "Template Configuration:"
    echo "  ID: $FULL_TEMPLATE_ID"
    echo "  Name: $TEMPLATE_NAME"
    echo "  Description: $TEMPLATE_DESCRIPTION"
    echo "  Category: $TEMPLATE_CATEGORY"
    echo "  Auth Type: $TEMPLATE_AUTH_TYPE"
    echo "  Complexity: $TEMPLATE_COMPLEXITY"
    echo "  Local Path: $MAIN_REPO_PATH/apps/$FULL_TEMPLATE_ID"
    echo ""
    
    read -p "Continue with template creation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Template creation cancelled"
        exit 1
    fi
    
    # Execute template creation steps
    generate_template_files
    update_cli_template_manager_dev
    build_and_test_cli
    
    echo ""
    print_success "Development template creation completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Test the template: mcpresso init test-project --template $FULL_TEMPLATE_ID --yes"
    echo "  2. Customize the template files in apps/$FULL_TEMPLATE_ID/"
    echo "  3. When ready, use the full script to create GitHub repo and subtrees"
    echo ""
    echo "Template is now available in the CLI for local development!"
}

# Run main function
main "$@" 