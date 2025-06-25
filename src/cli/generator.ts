import { parseOpenAPI } from './openapi-parser.js';
import { convertOpenAPISchemasToZod } from './schema-converter.js';
import chalk from 'chalk';
import { z } from 'zod';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface GenerateOptions {
  source: string;
  outputDir: string;
  serverName: string;
  verbose?: boolean;
  format?: boolean;
}

export async function generateFromOpenAPI(options: GenerateOptions): Promise<void> {
  const { source, outputDir, serverName, verbose = false, format = true } = options;
  
  if (verbose) {
    console.log(chalk.blue('🚀 Starting OpenAPI to MCPresso conversion...'));
  }

  try {
    // Step 1: Parse OpenAPI specification
    const parsed = await parseOpenAPI({ source, verbose });
    
    if (verbose) {
      console.log(chalk.green('✅ OpenAPI specification parsed successfully'));
    }

    // Step 2: Convert all schemas to Zod
    const schemas: any[] = [];
    const components = parsed.spec.components;
    
    if (components && components.schemas) {
      // Create a map of all schemas for reference resolution
      const allSchemasMap = new Map(Object.entries(components.schemas));
      
      for (const [schemaName, schema] of Object.entries(components.schemas)) {
        try {
          const zodSchema = convertZodToOpenAPI(schema as any, allSchemasMap);
          schemas.push({
            name: schemaName,
            schema: zodSchema
          });
          if (verbose) {
            console.log(`  ✅ Converted: ${schemaName}`);
          }
        } catch (error) {
          if (verbose) {
            console.log(`  ❌ Failed to convert schema '${schemaName}': ${error}`);
          }
        }
      }
    }

    if (verbose) {
      console.log(`✅ Successfully converted ${schemas.length} schemas`);
    }

    // Step 3: Generate MCPresso server code
    const serverCode = generateMCPServerCode(parsed, schemas, serverName, verbose);

    if (verbose) {
      console.log(chalk.green('✅ MCPresso server code generated'));
    }

    // Step 4: Write output files
    await writeOutputFiles(outputDir, serverCode, format, verbose);

    if (verbose) {
      console.log(chalk.green('✅ Output files written successfully'));
    }

  } catch (error) {
    console.error(chalk.red('❌ Generation failed:'), error);
    throw error;
  }
}

/**
 * Generate MCPresso server code from parsed OpenAPI data.
 */
function generateMCPServerCode(
  parsed: any,
  schemas: any[],
  serverName: string,
  verbose: boolean
): { server: string; types: string; packageJson: string; readme: string; apiClient: string; schemaFiles: Record<string, string>; resourceFiles: Record<string, string> } {
  
  // Find schemas that are actually used by resources
  const usedSchemas = findUsedSchemas(parsed.operations, schemas);
  
  if (verbose) {
    console.log(chalk.blue(`📦 Generating ${usedSchemas.length} schema files (out of ${schemas.length} total schemas)`));
  }
  
  // Generate individual schema files only for used schemas
  const schemaFiles: Record<string, string> = {};
  const allWarnings: string[] = [];
  
  for (const { name, schema, warnings } of usedSchemas) {
    const schemaString = serializeZodSchema(schema);
    const typeName = toPascalCase(name);
    const validName = toPascalCase(name);
    const schemaVar = `${validName}Schema`;
    
    // Collect warnings
    if (warnings) {
      allWarnings.push(...warnings);
    }
    
    // Include warnings in the schema file if they exist
    const warningComments = warnings && warnings.length > 0 ? 
      `\n${warnings.join('\n')}\n` : '';
    
    schemaFiles[`schemas/${typeName}.ts`] = `import { z } from 'zod';${warningComments}

export const ${schemaVar} = ${schemaString};

export type ${typeName} = z.infer<typeof ${schemaVar}>;
`;
  }

  // Generate individual resource files
  const resourceFiles: Record<string, string> = {};
  const resourceNames: string[] = [];
  
  const resourceGroups = groupOperationsByResource(parsed.operations, verbose);
  for (const [resourceName, resourceOps] of Object.entries(resourceGroups)) {
    const sanitizedResourceName = toValidIdentifier(resourceName);
    const snakeCaseName = toSnakeCase(resourceName);
    const resourceCode = generateResourceCode(sanitizedResourceName, snakeCaseName, resourceOps as any[], schemas);
    
    // Convert to proper naming conventions
    const camelCaseName = toCamelCase(sanitizedResourceName);
    const pascalCaseName = toPascalCase(snakeCaseName); // Use snake_case name for proper PascalCase conversion
    
    const schemaName = findPrimarySchemaForResource(resourceOps, schemas);
    resourceNames.push(`${camelCaseName}Resource`);
    
    resourceFiles[`resources/${pascalCaseName}Resource.ts`] = `${resourceCode}
`;
  }

  // Generate API client
  const apiClient = `import axios from 'axios';

// Configure the API client
const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication if needed
apiClient.interceptors.request.use((config) => {
  // Add auth token if available
  const token = process.env.API_TOKEN;
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export default apiClient;
`;

  // Generate main server file
  const resourceImports = resourceNames.map(name => {
    const camelCaseName = toCamelCase(name.replace('Resource', ''));
    const pascalCaseName = toPascalCase(name.replace('Resource', ''));
    return `import { ${camelCaseName}Resource } from './resources/${pascalCaseName}Resource.js';`;
  }).join('\n');
  const resourceArray = resourceNames.map(name => {
    const camelCaseName = toCamelCase(name.replace('Resource', ''));
    return `${camelCaseName}Resource`;
  }).join(', ');

  const serverCode = `import { createMCPServer } from 'mcpresso';
${resourceImports}

// Create the MCP server
const server = createMCPServer({
  name: '${serverName}',
  resources: [
    ${resourceArray}
  ],
  exposeTypes: true,
  serverMetadata: {
    name: '${serverName}',
    version: '1.0.0',
    description: 'Generated MCPresso server from OpenAPI specification',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
});

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3080;
server.listen(port, () => {
  console.log(\`🚀 Generated MCPresso server running on http://localhost:\${port}\`);
  console.log('📖 Server metadata available at: http://localhost:' + port);
});
`;

  // Generate types file only for used schemas
  const typeImports = usedSchemas.map(({ name }) => `import { ${toPascalCase(name)} } from './schemas/${toPascalCase(name)}.js';`).join('\n');
  const typeExports = usedSchemas.map(({ name }) => `export type { ${toPascalCase(name)} };`).join('\n');

  const typesCode = `${typeImports}

${typeExports}
`;

  // Generate package.json with axios dependency
  const packageJson = `{
  "name": "${serverName}",
  "version": "1.0.0",
  "description": "Generated MCPresso server from OpenAPI specification",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "tsx server.js",
    "dev": "tsx --watch server.js",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "mcpresso": "^0.2.3",
    "zod": "^3.23.8",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`;

  // Generate README
  const readme = `# ${serverName}

This is a generated MCPresso server created from an OpenAPI specification.

## Features

- Generated from OpenAPI specification
- Type-safe with Zod schemas
- MCP-compliant resource definitions
- HTTP handlers that call the original API endpoints
- Ready to run

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure the API client:
   Set environment variables:
   - \`API_BASE_URL\`: Base URL of your API (default: http://localhost:3000)
   - \`API_TOKEN\`: Authentication token (optional)
   - \`PORT\`: Server port (default: 3080)

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

4. The server will be available at \`http://localhost:3080\`

## Generated Resources

This server includes the following generated resources:

${parsed.operations.map((op: any) => `- ${op.operation.operationId || op.method + ' ' + op.path}`).join('\n')}

## Generated Schemas

This server includes the following generated schemas:

${usedSchemas.map(({ name }) => `- ${name}`).join('\n')}

## Customization

You can customize the generated code by:
1. Modifying the API client configuration in \`apiClient.ts\`
2. Adding custom authentication logic
3. Modifying the server configuration
4. Adding rate limiting or retries

## Development

To run in development mode with auto-restart:
\`\`\`bash
npm run dev
\`\`\`

## Environment Variables

- \`API_BASE_URL\`: Base URL for API calls
- \`API_TOKEN\`: Authentication token
- \`PORT\`: Server port (default: 3080)
`;

  return {
    server: serverCode,
    types: typesCode,
    packageJson,
    readme,
    apiClient,
    schemaFiles,
    resourceFiles,
  };
}

/**
 * Find schemas that are actually used by resources.
 */
function findUsedSchemas(operations: any[], schemas: any[]): any[] {
  const usedSchemaNames = new Set<string>();
  const allSchemas = new Map(schemas.map(s => [s.name, s]));
  
  // Recursively collect all referenced schemas
  function collectReferencedSchemas(schema: any, visited: Set<string> = new Set()): void {
    if (!schema || visited.has(schema.$ref)) return;
    
    if (schema.$ref) {
      visited.add(schema.$ref);
      const schemaName = extractRefName(schema.$ref);
      usedSchemaNames.add(schemaName);
      
      // Recursively process the referenced schema
      const refSchema = allSchemas.get(schemaName);
      if (refSchema) {
        collectReferencedSchemas(refSchema, visited);
      }
    }
    
    // Handle object properties
    if (schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        collectReferencedSchemas(propSchema as any, visited);
      }
    }
    
    // Handle array items
    if (schema.items) {
      collectReferencedSchemas(schema.items, visited);
    }
    
    // Handle union schemas (oneOf, anyOf, allOf)
    if (schema.oneOf) {
      for (const unionSchema of schema.oneOf) {
        collectReferencedSchemas(unionSchema, visited);
      }
    }
    if (schema.anyOf) {
      for (const unionSchema of schema.anyOf) {
        collectReferencedSchemas(unionSchema, visited);
      }
    }
    if (schema.allOf) {
      for (const unionSchema of schema.allOf) {
        collectReferencedSchemas(unionSchema, visited);
      }
    }
  }
  
  for (const operation of operations) {
    // Check request body schemas
    const requestBody = operation.operation.requestBody;
    if (requestBody && requestBody.content && requestBody.content['application/json']) {
      const schema = requestBody.content['application/json'].schema;
      if (schema) {
        collectReferencedSchemas(schema);
      }
    }
    
    // Check response schemas
    const responses = operation.operation.responses;
    if (responses) {
      for (const response of Object.values(responses)) {
        const typedResponse = response as any;
        if (typedResponse.content && typedResponse.content['application/json']) {
          const schema = typedResponse.content['application/json'].schema;
          if (schema) {
            collectReferencedSchemas(schema);
          }
        }
      }
    }
  }
  
  // Return only schemas that are actually used
  return schemas.filter(schema => usedSchemaNames.has(schema.name));
}

/**
 * Convert a Zod schema back to OpenAPI format for reference collection.
 * This is a simplified conversion for the purpose of finding references.
 */
function convertZodToOpenAPI(openAPISchema: any, allSchemas?: Map<string, any>, readonly = false): z.ZodTypeAny {
  if (!openAPISchema) {
    return z.any();
  }

  // Handle references
  if (openAPISchema.$ref) {
    const refName = extractRefName(openAPISchema.$ref);
    if (allSchemas && allSchemas.has(refName)) {
      // Recursively convert the referenced schema
      return convertZodToOpenAPI(allSchemas.get(refName), allSchemas, readonly);
    }
    // If we can't resolve the reference, create a reference to the schema name
    return z.lazy(() => {
      // This will be resolved when the schema is actually used
      return z.object({}).passthrough(); // Allow any properties for now
    });
  }

  // Handle different types
  switch (openAPISchema.type) {
    case 'string':
      let stringSchema = z.string();
      if (openAPISchema.enum) {
        return z.enum(openAPISchema.enum as [string, ...string[]]);
      }
      if (openAPISchema.format === 'date-time') {
        return z.string().datetime();
      }
      if (openAPISchema.format === 'date') {
        return z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (openAPISchema.format === 'email') {
        return z.string().email();
      }
      if (openAPISchema.format === 'uri') {
        return z.string().url();
      }
      return stringSchema;

    case 'number':
    case 'integer':
      let numberSchema = z.number();
      if (openAPISchema.minimum !== undefined) {
        numberSchema = numberSchema.min(openAPISchema.minimum);
      }
      if (openAPISchema.maximum !== undefined) {
        numberSchema = numberSchema.max(openAPISchema.maximum);
      }
      return numberSchema;

    case 'boolean':
      return z.boolean();

    case 'array':
      if (openAPISchema.items) {
        const itemSchema = convertZodToOpenAPI(openAPISchema.items, allSchemas, readonly);
        return z.array(itemSchema);
      }
      return z.array(z.any());

    case 'object':
      if (openAPISchema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        
        for (const [key, prop] of Object.entries(openAPISchema.properties)) {
          const propSchema = convertZodToOpenAPI(prop as any, allSchemas, readonly);
          
          // Check if the property is required
          const isRequired = openAPISchema.required && openAPISchema.required.includes(key);
          shape[key] = isRequired ? propSchema : propSchema.optional();
        }
        
        const objectSchema = z.object(shape);
        return readonly ? objectSchema.readonly() : objectSchema;
      }
      return z.record(z.any());

    default:
      // Handle oneOf/anyOf
      if (openAPISchema.oneOf || openAPISchema.anyOf) {
        const unionSchemas = (openAPISchema.oneOf || openAPISchema.anyOf) as any[];
        const zodSchemas = unionSchemas.map(schema => convertZodToOpenAPI(schema, allSchemas, readonly));
        if (zodSchemas.length >= 2) {
          return z.union([zodSchemas[0], zodSchemas[1], ...zodSchemas.slice(2)]);
        }
        return zodSchemas[0] || z.any();
      }

      // Handle allOf
      if (openAPISchema.allOf) {
        const allOfSchemas = openAPISchema.allOf as any[];
        const zodSchemas = allOfSchemas.map(schema => convertZodToOpenAPI(schema, allSchemas, readonly));
        // For allOf, we merge the objects
        if (zodSchemas.length >= 2) {
          return z.intersection(zodSchemas[0], zodSchemas[1], ...zodSchemas.slice(2));
        }
        return zodSchemas[0] || z.any();
      }

      return z.any();
  }
}

/**
 * Find the primary schema for a resource based on its operations' response schemas.
 * Prefers 200 responses, then falls back to other success responses.
 */
function findPrimarySchemaForResource(operations: any[], schemas: any[]): string | null {
  const allSchemas = new Map(schemas.map(s => [s.name, s]));
  
  // Helper function to extract schema name from a schema reference
  const extractSchemaFromRef = (schema: any): string | null => {
    if (schema && schema.$ref) {
      return extractRefName(schema.$ref);
    }
    return null;
  };
  
  // Helper function to extract schema name from array items
  const extractSchemaFromArray = (schema: any): string | null => {
    if (schema && schema.type === 'array' && schema.items) {
      return extractSchemaFromRef(schema.items);
    }
    return null;
  };
  
  // Helper function to extract schema name from oneOf/anyOf
  const extractSchemaFromUnion = (schema: any): string[] => {
    const schemas: string[] = [];
    if (schema && (schema.oneOf || schema.anyOf)) {
      const unionSchemas = schema.oneOf || schema.anyOf;
      for (const unionSchema of unionSchemas) {
        const schemaName = extractSchemaFromRef(unionSchema);
        if (schemaName) {
          schemas.push(schemaName);
        }
      }
    }
    return schemas;
  };
  
  // Look for the first valid response schema
  for (const operation of operations) {
    const responses = operation.operation.responses;
    if (!responses) continue;
    
    // Look for 200 responses first
    if (responses['200'] && responses['200'].content && responses['200'].content['application/json']) {
      const schema = responses['200'].content['application/json'].schema;
      
      // Try direct schema reference
      const directSchema = extractSchemaFromRef(schema);
      if (directSchema && allSchemas.has(directSchema)) {
        console.log(`Found schema for ${operation.operation.operationId}: ${directSchema}`);
        return directSchema;
      }
      
      // Try array schema
      const arraySchema = extractSchemaFromArray(schema);
      if (arraySchema && allSchemas.has(arraySchema)) {
        console.log(`Found array schema for ${operation.operation.operationId}: ${arraySchema}`);
        return arraySchema;
      }
      
      // Try union schemas
      const unionSchemas = extractSchemaFromUnion(schema);
      for (const schemaName of unionSchemas) {
        if (allSchemas.has(schemaName)) {
          console.log(`Found union schema for ${operation.operation.operationId}: ${schemaName}`);
          return schemaName;
      }
    }
  }
  
  // Fallback to any success response (2xx)
      for (const [statusCode, response] of Object.entries(responses)) {
      if (statusCode.startsWith('2') && statusCode !== '200' && 
          (response as any).content && (response as any).content['application/json']) {
          const schema = (response as any).content['application/json'].schema;
        
        const directSchema = extractSchemaFromRef(schema);
        if (directSchema && allSchemas.has(directSchema)) {
          console.log(`Found schema for ${operation.operation.operationId} (${statusCode}): ${directSchema}`);
          return directSchema;
        }
        
        const arraySchema = extractSchemaFromArray(schema);
        if (arraySchema && allSchemas.has(arraySchema)) {
          console.log(`Found array schema for ${operation.operation.operationId} (${statusCode}): ${arraySchema}`);
          return arraySchema;
        }
        
        const unionSchemas = extractSchemaFromUnion(schema);
        for (const schemaName of unionSchemas) {
            if (allSchemas.has(schemaName)) {
            console.log(`Found union schema for ${operation.operation.operationId} (${statusCode}): ${schemaName}`);
              return schemaName;
          }
        }
      }
    }
  }
  
  console.log(`No schema found for resource with operations: ${operations.map(op => op.operation.operationId).join(', ')}`);
  return null;
}

/**
 * Serialize a Zod schema to a string representation.
 */
function serializeZodSchema(schema: z.ZodTypeAny): string {
  // This is a simplified serialization - in a real implementation,
  // you would need to traverse the schema structure and convert it to code
  // For now, we'll use a basic approach that works for common cases
  
  if (schema._def.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    const properties: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const serialized = serializeZodType(value as z.ZodTypeAny);
      properties.push(`  ${key}: ${serialized}`);
    }
    
    return `z.object({\n${properties.join(',\n')}\n})`;
  }
  
  return serializeZodType(schema);
}

/**
 * Serialize a Zod type to a string representation.
 */
function serializeZodType(schema: z.ZodTypeAny): string {
  const typeName = schema._def.typeName;
  
  switch (typeName) {
    case 'ZodString':
      return 'z.string()';
    case 'ZodNumber':
      return 'z.number()';
    case 'ZodBoolean':
      return 'z.boolean()';
    case 'ZodArray':
      const itemType = serializeZodType(schema._def.type);
      return `z.array(${itemType})`;
    case 'ZodOptional':
      const innerType = serializeZodType(schema._def.innerType);
      return `${innerType}.optional()`;
    case 'ZodReadonly':
      const readonlyInnerType = serializeZodType(schema._def.innerType);
      return `${readonlyInnerType}.readonly()`;
    case 'ZodUnion':
      const options = schema._def.options.map((opt: z.ZodTypeAny) => serializeZodType(opt));
      return `z.union([${options.join(', ')}])`;
    case 'ZodLiteral':
      const value = schema._def.value;
      if (typeof value === 'string') {
        return `z.literal("${value}")`;
      }
      return `z.literal(${value})`;
    case 'ZodEnum':
      const enumValues = schema._def.values;
      return `z.enum([${enumValues.map((v: string) => `"${v}"`).join(', ')}])`;
    default:
      // Fallback for complex types
      return 'z.any()';
  }
}

/**
 * Generate resource definitions from OpenAPI operations.
 */
function generateResourceDefinitions(operations: any[], schemas: any[], verbose: boolean): string {
  const resources: string[] = [];

  // Group operations by resource with smart CRUD detection
  const resourceGroups = groupOperationsByResource(operations);

  for (const [resourceName, resourceOps] of Object.entries(resourceGroups)) {
    const snakeCaseName = toSnakeCase(resourceName);
    const resourceCode = generateResourceCode(resourceName, snakeCaseName, resourceOps as any[], schemas);
    resources.push(resourceCode);
  }

  return resources.join('\n\n');
}

/**
 * Extract resource name from path.
 */
function extractResourceName(path: string): string {
  // Remove leading slash and split by slashes
  const parts = path.replace(/^\//, '').split('/');
  
  // Get the first meaningful part (skip empty strings)
  const resourcePart = parts.find(part => part && !part.startsWith('{'));
  
  if (resourcePart) {
    // Convert to camelCase
    return resourcePart.replace(/[-_]/g, '').toLowerCase();
  }
  
  // Fallback to 'api' if no clear resource name
  return 'api';
}

/**
 * Convert a string to camelCase.
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toLowerCase());
}

/**
 * Convert a string to snake_case.
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[-_\s]+/g, '_')
    .replace(/_$/, ''); // Remove trailing underscore
}

/**
 * Convert a string to kebab-case.
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[-_\s]+/g, '-');
  }
  
/**
 * Group operations by resource name based on path.
 */
function groupOperationsByResource(operations: any[], verbose: boolean = false): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  for (const operation of operations) {
    const path = operation.path;
    
    // Split path into parts
    const parts = path.replace(/^\//, '').split('/');
    
    // Determine resource name based on path structure
    let resourceName: string;
    
    if (parts.length === 1) {
      // Simple resource like /users
      resourceName = parts[0].toLowerCase();
    } else if (parts.length === 2 && parts[1].startsWith('{')) {
      // Resource with ID like /users/{username}
      resourceName = parts[0].toLowerCase();
    } else if (parts.length >= 3 && parts[1].startsWith('{') && !parts[2].startsWith('{')) {
      // Sub-resource like /users/{username}/packages
      // Create a separate resource for the sub-resource
      resourceName = `${parts[0]}_${parts[2]}`.toLowerCase();
    } else if (parts.length >= 3 && parts[2].startsWith('{')) {
      // Sub-resource with ID like /users/{username}/packages/{package_name}
      resourceName = `${parts[0]}_${parts[1]}`.toLowerCase();
    } else {
      // Fallback to first part
      resourceName = parts[0].toLowerCase();
    }
    
    // Convert to snake_case for the resource name
    resourceName = toSnakeCase(resourceName);
    
    // Sanitize the resource name to be a valid JavaScript identifier
    const sanitizedResourceName = toValidIdentifier(resourceName);
    
    // Skip problematic resource names
    if (sanitizedResourceName === 'resource' || sanitizedResourceName === 'api' || sanitizedResourceName === '') {
      if (verbose) {
        console.log(`Skipping problematic resource name: "${sanitizedResourceName}" from path: ${path}`);
      }
      continue;
  }
  
    if (!groups[sanitizedResourceName]) {
      groups[sanitizedResourceName] = [];
    }
    groups[sanitizedResourceName].push(operation);
  }
  
  return groups;
}

/**
 * Generate resource code with HTTP handlers.
 */
function generateResourceCode(resourceName: string, snakeCaseName: string, operations: any[], schemas: any[]): string {
  const warnings: string[] = [];

  // Find the appropriate schema for this resource based on operation responses
  const schemaName = findPrimarySchemaForResource(operations, schemas);
  let schemaRef: string;

  if (schemaName) {
    schemaRef = `${toValidIdentifier(schemaName)}Schema`;
  } else {
    schemaRef = 'z.object({ id: z.string() })';
    warnings.push(`// Warning: No schema found for resource '${resourceName}'. Using fallback schema.`);
  }
  
  // Group operations by HTTP method to map to MCPresso methods
  const operationsByMethod = groupOperationsByMethod(operations);

  // Build methods object
  const methodEntries: string[] = [];
  const methodMap: Record<string, string> = { get: 'get', post: 'create', put: 'update', delete: 'delete' };

  for (const [httpMethod, mcpMethod] of Object.entries(methodMap)) {
    if (operationsByMethod[httpMethod] && operationsByMethod[httpMethod].length > 0) {
      const operation = operationsByMethod[httpMethod][0];
      const description = operation.operation.description || operation.operation.summary || `${httpMethod.toUpperCase()} ${operation.path}`;
      const escapedDescription = description
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
        .replace(/`([^`]+)`/g, '$1'); // Remove backticks
      
      // Find schema for this specific method
      const methodSchemaName = findSchemaForMethod(operation, schemas, httpMethod);
      const methodSchema = methodSchemaName ? generateMethodSpecificSchema(methodSchemaName, httpMethod) : 'z.object({ id: z.string() })';
      
      const handlerCode = generateHandlerCode(operation, schemas, warnings);
      
      // Delete methods don't support inputSchema in MCPresso
      if (httpMethod === 'delete') {
        methodEntries.push(`    ${mcpMethod}: {
      description: "${escapedDescription}",
      handler: ${handlerCode}
    }`);
      } else {
        methodEntries.push(`    ${mcpMethod}: {
      description: "${escapedDescription}",
      inputSchema: ${methodSchema},
      handler: ${handlerCode}
    }`);
      }
    }
  }
  
  // Compose warnings if any
  const warningComments = warnings.length > 0 ? `\n${warnings.join('\n')}\n` : '';
  
  // Compose the resource file
  return `import { z } from 'zod';
import { createResource } from 'mcpresso';
import apiClient from '../apiClient.js';
${getSchemaImports(operations, schemas)}

${warningComments}export const ${toCamelCase(snakeCaseName)}Resource = createResource({
  name: "${snakeCaseName}",
  schema: ${schemaRef},
  uri_template: "${snakeCaseName}/{id}",
  methods: {
${methodEntries.join(',\n')}
  }
});`;
}

/**
 * Generate handler code for a given operation.
 */
function generateHandlerCode(operation: any, schemas: any[], warnings: string[]): string {
  const schemaName = findPrimarySchemaForResource([operation], schemas);
  let schemaRef: string;
  
  if (schemaName) {
    schemaRef = `${toValidIdentifier(schemaName)}Schema`;
  } else {
    schemaRef = 'z.object({ id: z.string() })';
    warnings.push(`// Warning: No schema found for operation '${operation.operation.operationId}'. Using fallback schema.`);
  }
  
  // Process the URL to replace path parameters with args
  let processedUrl = operation.path;
  const pathParams = operation.path.match(/\{([^}]+)\}/g);
  if (pathParams) {
    for (const param of pathParams) {
      const paramName = param.slice(1, -1); // Remove { and }
      processedUrl = processedUrl.replace(param, `\${args.${paramName}}`);
    }
  }
  
  return `async (args) => {
        try {
          const response = await apiClient({
            method: '${operation.method}',
            url: '${processedUrl}',
            data: args
          });
      return response.data;
        } catch (error: any) {
          if (error.response) {
            // Server responded with error status
            console.error('API Error:', error.response.status, error.response.data);
            throw new Error(\`API Error: \${error.response.status} - \${JSON.stringify(error.response.data)}\`);
          } else if (error.request) {
            // Request was made but no response received
            console.error('Network Error:', error.request);
            throw new Error('Network Error: No response received');
          } else {
            // Something else happened
            console.error('Error:', error.message);
            throw new Error(\`Request Error: \${error.message}\`);
          }
    }
  }`;
}

/**
 * Group operations by HTTP method.
 */
function groupOperationsByMethod(operations: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = { get: [], post: [], put: [], delete: [] };
  
  for (const operation of operations) {
    const method = operation.method.toLowerCase();
    if (method in groups) {
      groups[method].push(operation);
    }
  }
  
  return groups;
}

/**
 * Extract reference name from a schema reference.
 */
function extractRefName(ref: string): string {
  const parts = ref.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Convert kebab-case or snake_case to PascalCase.
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s/g, '');
}

/**
 * Convert a string to a valid JavaScript identifier (alphanumeric and underscores only).
 */
function toValidIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Write output files to the specified directory.
 */
async function writeOutputFiles(
  outputDir: string,
  code: { server: string; types: string; packageJson: string; readme: string; apiClient: string; schemaFiles: Record<string, string>; resourceFiles: Record<string, string> },
  format: boolean,
  verbose: boolean
): Promise<void> {
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Write main files
  const files = [
    { name: 'server.js', content: code.server },
    { name: 'types.ts', content: code.types },
    { name: 'package.json', content: code.packageJson },
    { name: 'README.md', content: code.readme },
    { name: 'apiClient.ts', content: code.apiClient },
  ];

  for (const file of files) {
    const filePath = path.join(outputDir, file.name);
    await fs.writeFile(filePath, file.content, 'utf-8');
    if (verbose) {
      console.log(chalk.gray(`  → Wrote: ${file.name}`));
    }
  }

  // Write schema files
  for (const [fileName, content] of Object.entries(code.schemaFiles)) {
    const filePath = path.join(outputDir, fileName);
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    if (verbose) {
      console.log(chalk.gray(`  → Wrote: ${fileName}`));
    }
  }

  // Write resource files
  for (const [fileName, content] of Object.entries(code.resourceFiles)) {
    const filePath = path.join(outputDir, fileName);
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    if (verbose) {
      console.log(chalk.gray(`  → Wrote: ${fileName}`));
    }
  }
}

/**
 * Generate a schema with readonly properties based on HTTP method.
 * GET operations should have readonly properties, while POST/PUT can be writable.
 */
function generateMethodSpecificSchema(schemaName: string, httpMethod: string): string {
  // For GET operations, make properties readonly
  // For POST/PUT operations, keep them writable
  const isReadonly = httpMethod.toLowerCase() === 'get';
  
  // Use the schema reference and apply readonly if needed
  const schemaRef = `${toValidIdentifier(schemaName)}Schema`;
  return isReadonly ? `${schemaRef}.readonly()` : schemaRef;
}

/**
 * Find the appropriate schema for a method based on HTTP method.
 * GET operations use response schemas, POST/PUT operations use request body schemas.
 */
function findSchemaForMethod(operation: any, schemas: any[], httpMethod: string): string | null {
  const allSchemas = new Map(schemas.map(s => [s.name, s]));
  
  // Helper function to extract schema name from a schema reference
  const extractSchemaFromRef = (schema: any): string | null => {
    if (schema && schema.$ref) {
      return extractRefName(schema.$ref);
    }
    return null;
  };
  
  // Helper function to extract schema name from array items
  const extractSchemaFromArray = (schema: any): string | null => {
    if (schema && schema.type === 'array' && schema.items) {
      return extractSchemaFromRef(schema.items);
    }
    return null;
  };
  
  // For GET operations, look at response schemas
  if (httpMethod.toLowerCase() === 'get') {
    const responses = operation.operation.responses;
    if (!responses) return null;
    
    // Look for 200 responses first
    if (responses['200'] && responses['200'].content && responses['200'].content['application/json']) {
      const schema = responses['200'].content['application/json'].schema;
      
      // Try direct schema reference
      const directSchema = extractSchemaFromRef(schema);
      if (directSchema && allSchemas.has(directSchema)) {
        return directSchema;
      }
      
      // Try array schema
      const arraySchema = extractSchemaFromArray(schema);
      if (arraySchema && allSchemas.has(arraySchema)) {
        return arraySchema;
      }
  }
  
    // Fallback to any success response (2xx)
    for (const [statusCode, response] of Object.entries(responses)) {
      if (statusCode.startsWith('2') && statusCode !== '200' && 
          (response as any).content && (response as any).content['application/json']) {
        const schema = (response as any).content['application/json'].schema;
        
        const directSchema = extractSchemaFromRef(schema);
        if (directSchema && allSchemas.has(directSchema)) {
          return directSchema;
        }
        
        const arraySchema = extractSchemaFromArray(schema);
        if (arraySchema && allSchemas.has(arraySchema)) {
          return arraySchema;
    }
      }
    }
  }
  
  // For POST/PUT operations, look at request body schemas
  if (httpMethod.toLowerCase() === 'post' || httpMethod.toLowerCase() === 'put') {
    const requestBody = operation.operation.requestBody;
  if (requestBody && requestBody.content && requestBody.content['application/json']) {
    const schema = requestBody.content['application/json'].schema;
      
      // Try direct schema reference
      const directSchema = extractSchemaFromRef(schema);
      if (directSchema && allSchemas.has(directSchema)) {
        return directSchema;
  }
  
      // Try array schema
      const arraySchema = extractSchemaFromArray(schema);
      if (arraySchema && allSchemas.has(arraySchema)) {
        return arraySchema;
      }
    }
  }
  
  return null;
}

/**
 * Generate a string of schema imports for a given set of operations and schemas.
 */
function getSchemaImports(operations: any[], schemas: any[]): string {
  const schemaImports = new Set<string>();
  
  for (const operation of operations) {
    const responses = operation.operation.responses;
    if (responses) {
      for (const [statusCode, response] of Object.entries(responses)) {
        const typedResponse = response as any;
        if (typedResponse && typedResponse.content && typedResponse.content['application/json'] && typedResponse.content['application/json'].schema) {
          const schemaName = findPrimarySchemaForResource([operation], schemas);
          if (schemaName) {
            schemaImports.add(`import { ${toPascalCase(schemaName)}Schema } from '../schemas/${toPascalCase(schemaName)}.js';`);
          }
        }
      }
    }
    
    // Also check request body for POST/PUT operations
    const requestBody = operation.operation.requestBody;
    if (requestBody && requestBody.content && requestBody.content['application/json']) {
      const schemaName = findPrimarySchemaForResource([operation], schemas);
      if (schemaName) {
        schemaImports.add(`import { ${toPascalCase(schemaName)}Schema } from '../schemas/${toPascalCase(schemaName)}.js';`);
      }
    }
  }
  
  return Array.from(schemaImports).join('\n');
} 