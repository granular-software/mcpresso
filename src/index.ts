import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Express, Request, Response } from 'express';
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { type AuthConfig, createAuthMiddleware } from './auth';

// --- Type Definitions ---

export interface CustomMethodConfig<
  TInput extends z.ZodObject<any>,
  TOutput
> {
  description: string;
  inputSchema: TInput;
  handler: (args: z.infer<TInput>) => Promise<TOutput>;
}

interface Relation {
  type: string;
}

export type ResourceHandlers<T extends z.ZodObject<any, any, any>> = {
  get?: (args: { id: string }) => Promise<z.infer<T> | undefined>;
  create?: (data: Partial<z.input<T>>) => Promise<z.infer<T>>;
  update?: (data: Partial<z.input<T>> & { id: string }) => Promise<z.infer<T> | undefined>;
  delete?: (args: { id: string }) => Promise<boolean>;
  list?: () => Promise<z.infer<T>[]>;
  search?: (args: any) => Promise<z.infer<T>[]>;
};

export interface ResourceConfig<T extends z.ZodObject<any, any, any>> {
  name: string;
  schema: T;
  uri_template: string;
  relations?: { [field_name: string]: Relation };
  handlers: ResourceHandlers<T>;
  methodConfig?: {
    create?: {
      omit: ReadonlyArray<keyof T['shape']>;
    };
    update?: {
      pick: ReadonlyArray<keyof T['shape']>;
    };
    search?: {
        schema: z.ZodObject<any>;
    };
  };
  customMethods?: {
    [methodName: string]: CustomMethodConfig<z.ZodObject<any>, any>;
  };
}

export interface MCPServerConfig {
  name: string;
  serverUrl: string;
  resources: ResourceConfig<any>[];
  exposeTypes?: boolean | ResourceConfig<any>[];
  auth?: AuthConfig;
}

// --- Type Definitions for Exposed Types ---

interface TypeField {
  name: string;
  type: string;
  description?: string;
  relation?: string;
}

interface TypeResource {
  name: string;
  description?: string;
  fields: TypeField[];
  related_tools: string[];
}

// --- Helper Functions ---
function applyRelationsToJsonSchema(
    jsonSchema: any, 
    zodSchema: z.ZodObject<any>,
    relations: { [field_name: string]: Relation } | undefined, 
    serverName: string
) {
    if (!relations || !('properties' in jsonSchema)) {
        return jsonSchema;
    }

    const newProperties = { ...jsonSchema.properties };

    for (const fieldName in relations) {
        if (newProperties[fieldName]) {
            const relatedResourceName = relations[fieldName].type;
            const ref = `type://${serverName}/${relatedResourceName}`;
            const fieldZodDef = zodSchema.shape[fieldName];

            if (fieldZodDef instanceof z.ZodArray) {
                newProperties[fieldName].items = { $ref: ref };
            } else {
                newProperties[fieldName] = { $ref: ref };
            }
        }
    }

    return { ...jsonSchema, properties: newProperties };
}

// --- Core Implementation ---

export function createResource<T extends z.ZodObject<any, any, any>>(
  config: ResourceConfig<T>
): ResourceConfig<T> {
  return config;
}

export function createMCPServer(config: MCPServerConfig): Express {
    const app = express();
    app.use(cors());
    app.use(express.json());

    if (config.auth) {
        app.get('/.well-known/oauth-protected-resource-metadata', (req, res) => {
            if (!config.auth) return res.status(500).send('Auth not configured');
            res.json({
                resource: config.serverUrl,
                authorization_servers: [config.auth.issuer],
            });
        });
    }

    const authMiddleware = config.auth
        ? createAuthMiddleware(config.auth, config.serverUrl)
        : (req: Request, res: Response, next: express.NextFunction) => next();

    const server = new McpServer({
        name: config.name,
        version: '1.0.0',
    }, {});

    // --- Validation ---
    const resourceNames = new Set(config.resources.map(r => r.name));
    for (const resource of config.resources) {
        if (resource.relations) {
            for (const fieldName in resource.relations) {
                if (!resource.schema.shape[fieldName]) {
                    throw new Error(`Configuration error in resource '${resource.name}': Relation field '${fieldName}' does not exist in the schema.`);
                }
                const relatedResourceName = resource.relations[fieldName].type;
                if (!resourceNames.has(relatedResourceName)) {
                    throw new Error(`Configuration error in resource '${resource.name}': Related resource type '${relatedResourceName}' for field '${fieldName}' is not defined.`);
                }
            }
        }
    }

    // --- Type Exposure ---

    if (config.exposeTypes) {
        const resourcesToExpose = config.exposeTypes === true
            ? config.resources
            : config.exposeTypes;
        
        for (const resourceConfig of resourcesToExpose) {
            const { name: resourceName, schema, handlers, uri_template, relations } = resourceConfig;
            
            const baseJsonSchema = zodToJsonSchema(schema, {
                $refStrategy: 'none'
            });

            const jsonSchemaWithRelations = applyRelationsToJsonSchema(baseJsonSchema, schema, relations, config.name);

            const related_tools = Object.keys(handlers)
                .map(handlerName => {
                    if (handlerName === 'list') return `list_${resourceName}s`;
                    if (handlerName === 'get') return null; // Not a tool
                    return `${handlerName}_${resourceName}`;
                })
                .filter((toolName): toolName is string => toolName !== null);
            
            const resource_template_uri = handlers.get ? `data://${config.name}/${uri_template}` : undefined;

            const typeResource = {
                ...jsonSchemaWithRelations,
                name: resourceName,
                description: schema.description,
                related_tools,
                resource_template_uri,
            };
            
            const uri = `type://${config.name}/${resourceName}`;
            server.resource(`type_${resourceName}`, uri, async (): Promise<ReadResourceResult> => {
                return {
                    contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(typeResource, null, 2),
                    }],
                };
            });
        }
    }

    for (const resource of config.resources) {
        const { name, schema, handlers, uri_template, relations, customMethods } = resource;

        const generateUri = (item: { id: string }): string => {
            return `data://${config.name}/${uri_template.replace('{id}', item.id)}`;
        };

        if (handlers.get) {
            const full_uri_template = `data://${config.name}/${uri_template}`;
            const template = new ResourceTemplate(full_uri_template, { list: undefined });
            server.resource(name, template, async (uri, { id }): Promise<ReadResourceResult> => {
                const item = await handlers.get!({ id: id as string });
                if (!item) {
                    return { contents: [] };
                }
                return {
                    contents: [{
                        uri: uri.href,
                        mimeType: 'application/json',
                        text: JSON.stringify(item),
                    }],
                };
            });
        }

        if (handlers.create) {
            const omitKeys = resource.methodConfig?.create?.omit ?? ['id', 'createdAt', 'updatedAt'];
            const omitShape = omitKeys.reduce((acc, key) => ({ ...acc, [String(key)]: true }), {});
            const createSchema = schema.omit(omitShape);

            const tempServer = new McpServer({ name: 'temp', version: '1.0.0' }, {});
            const tempTool = tempServer.tool('temp', 'temp', createSchema.shape, async () => ({ content: [] }));
            const inputSchemaWithRelations = applyRelationsToJsonSchema(tempTool.inputSchema, createSchema, relations, config.name);
            
            const registeredTool = server.tool(`create_${name}`, `Create a new ${name}.`, createSchema.shape, async (args: z.infer<typeof createSchema>): Promise<CallToolResult> => {
                const result = await handlers.create!(args as any);
                const resultWithUri = { ...result, uri: generateUri(result) };
                return { content: [{ type: 'text', text: JSON.stringify(resultWithUri) }] };
            });
            (registeredTool as any).inputSchema = inputSchemaWithRelations;
        }

        if (handlers.update) {
            let updateSchema;
            if (resource.methodConfig?.update?.pick) {
                const pickKeys = resource.methodConfig.update.pick;
                const pickShape = pickKeys.reduce((acc, key) => ({ ...acc, [String(key)]: true }), {});
                updateSchema = schema.pick(pickShape).partial().extend({ id: z.string() });
            } else {
                updateSchema = schema.omit({ id: true, createdAt: true, updatedAt: true }).partial().extend({ id: z.string() });
            }
            
            const tempServer = new McpServer({ name: 'temp', version: '1.0.0' }, {});
            const tempTool = tempServer.tool('temp', 'temp', updateSchema.shape, async () => ({ content: [] }));
            const inputSchemaWithRelations = applyRelationsToJsonSchema(tempTool.inputSchema, updateSchema, relations, config.name);

            const registeredTool = server.tool(`update_${name}`, `Update an existing ${name}.`, updateSchema.shape, async (args: z.infer<typeof updateSchema>): Promise<CallToolResult> => {
                const result = await handlers.update!(args as any);
                if (!result) {
                    return { content: [{ type: 'text', text: JSON.stringify(null) }] };
                }
                const resultWithUri = { ...result, uri: generateUri(result) };
                return { content: [{ type: 'text', text: JSON.stringify(resultWithUri) }] };
            });
            (registeredTool as any).inputSchema = inputSchemaWithRelations;
        }

        if (handlers.delete) {
            server.tool(`delete_${name}`, `Delete a ${name} by its ID.`, { id: z.string() }, async ({ id }): Promise<CallToolResult> => {
                const success = await handlers.delete!({ id });
                return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
            });
        }

        if (handlers.list) {
            server.tool(`list_${name}s`, `List all ${name}s.`, {}, async (): Promise<CallToolResult> => {
                const results = await handlers.list!();
                const resultsWithUris = results.map(item => ({
                    ...item,
                    uri: generateUri(item)
                }));
                return { content: [{ type: 'text', text: JSON.stringify(resultsWithUris) }] };
            });
        }

        if (handlers.search && resource.methodConfig?.search?.schema) {
            const searchSchema = resource.methodConfig.search.schema;
            const tempServer = new McpServer({ name: 'temp', version: '1.0.0' }, {});
            const tempTool = tempServer.tool('temp', 'temp', searchSchema.shape, async () => ({ content: [] }));
            const inputSchemaWithRelations = applyRelationsToJsonSchema(tempTool.inputSchema, searchSchema, relations, config.name);

            const registeredTool = server.tool(`search_${name}s`, `Search for ${name}s based on criteria.`, searchSchema.shape, async (args: z.infer<typeof searchSchema>): Promise<CallToolResult> => {
                const results = await handlers.search!(args);
                const resultsWithUris = results.map(item => ({
                    ...item,
                    uri: generateUri(item)
                }));
                return { content: [{ type: 'text', text: JSON.stringify(resultsWithUris) }] };
            });
            (registeredTool as any).inputSchema = inputSchemaWithRelations;
        }

        if (customMethods) {
            for (const methodName in customMethods) {
                const methodConfig = customMethods[methodName];
                const { description, inputSchema, handler } = methodConfig;

                const tempServer = new McpServer({ name: 'temp', version: '1.0.0' }, {});
                const tempTool = tempServer.tool('temp', 'temp', inputSchema.shape, async () => ({ content: [] }));
                const inputSchemaWithRelations = applyRelationsToJsonSchema(tempTool.inputSchema, inputSchema, relations, config.name);

                const registeredTool = server.tool(`${methodName}_${name}`, description, inputSchema.shape, async (args: z.infer<typeof inputSchema>): Promise<CallToolResult> => {
                    const result = await handler(args);
                    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
                });
                (registeredTool as any).inputSchema = inputSchemaWithRelations;
            }
        }
    }

    app.post('/', authMiddleware, async (req: Request, res: Response) => {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
            transport.close();
        });
    });

    return app;
}
