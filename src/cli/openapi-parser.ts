import { readFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
import type { OpenAPIV3 } from 'openapi-types';
import chalk from 'chalk';

export interface ParsedOpenAPI {
  spec: OpenAPIV3.Document;
  paths: OpenAPIV3.PathItemObject[];
  schemas: Record<string, OpenAPIV3.SchemaObject>;
  operations: Array<{
    method: string;
    path: string;
    operation: OpenAPIV3.OperationObject;
    pathItem: OpenAPIV3.PathItemObject;
  }>;
}

export interface ParseOptions {
  source: string;
  verbose?: boolean;
}

function isReferenceObject(obj: any): obj is OpenAPIV3.ReferenceObject {
  return obj && typeof obj === 'object' && '$ref' in obj;
}

function isSchemaObject(obj: any): obj is OpenAPIV3.SchemaObject {
  return obj && typeof obj === 'object' && !isReferenceObject(obj);
}

export async function parseOpenAPI(options: ParseOptions): Promise<ParsedOpenAPI> {
  const { source, verbose = false } = options;
  
  if (verbose) {
    console.log(chalk.blue(`📖 Parsing OpenAPI specification: ${source}`));
  }

  try {
    const isUrl = source.startsWith('http://') || source.startsWith('https://');
    let spec: OpenAPIV3.Document;
    
    if (isUrl) {
      if (verbose) console.log(chalk.gray('  → Fetching from URL...'));
      const response = await axios.get(source, { responseType: "text" });
      const responseText = response.data;
      
      try {
        spec = JSON.parse(responseText) as OpenAPIV3.Document;
      } catch {
        const yaml = await import("js-yaml");
        spec = (yaml as any).load(responseText) as OpenAPIV3.Document;
      }
    } else {
      if (verbose) console.log(chalk.gray('  → Reading from file...'));
      const filePath = resolve(process.cwd(), source);
      const fileContent = readFileSync(filePath, 'utf-8');
      
      try {
        spec = JSON.parse(fileContent) as OpenAPIV3.Document;
      } catch {
        const yaml = await import('js-yaml');
        spec = (yaml as any).load(fileContent) as OpenAPIV3.Document;
      }
    }

    if (verbose) {
      console.log(chalk.green('  ✅ Specification parsed successfully'));
      console.log(chalk.gray(`  → Title: ${spec.info?.title || 'Untitled'}`));
      console.log(chalk.gray(`  → Version: ${spec.info?.version || 'Unknown'}`));
      console.log(chalk.gray(`  → OpenAPI Version: ${spec.openapi || 'Unknown'}`));
    }

    await validateOpenAPI(spec, verbose);
    const result = extractOpenAPIData(spec, verbose);

    if (verbose) {
      console.log(chalk.green('  ✅ Data extraction completed'));
      console.log(chalk.gray(`  → Paths: ${result.paths.length}`));
      console.log(chalk.gray(`  → Schemas: ${Object.keys(result.schemas).length}`));
      console.log(chalk.gray(`  → Operations: ${result.operations.length}`));
    }

    return result;

  } catch (error) {
    console.error(chalk.red('❌ Failed to parse OpenAPI specification:'), error);
    throw new Error(`OpenAPI parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateOpenAPI(spec: OpenAPIV3.Document, verbose: boolean): Promise<void> {
  if (verbose) console.log(chalk.blue('  🔍 Validating specification...'));

  const errors: string[] = [];

  if (!spec.openapi || !spec.openapi.startsWith('3.')) {
    errors.push('OpenAPI specification must be version 3.x');
  }

  if (!spec.info) {
    errors.push('OpenAPI specification must have an info object');
  }

  if (!spec.paths || Object.keys(spec.paths).length === 0) {
    errors.push('OpenAPI specification must have at least one path');
  }

  if (!spec.components?.schemas || Object.keys(spec.components.schemas).length === 0) {
    if (verbose) console.log(chalk.yellow('  ⚠️  No schemas found in components.schemas - this is optional'));
  }

  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
      if (method === '$ref' || !operation || typeof operation !== 'object') continue;
      
      if (typeof operation === 'object' && !Array.isArray(operation)) {
        if (!operation.operationId) {
          if (verbose) console.log(chalk.yellow(`  ⚠️  Operation at ${method.toUpperCase()} ${path} has no operationId`));
        }
        
        if (!operation.responses || Object.keys(operation.responses).length === 0) {
          if (verbose) console.log(chalk.yellow(`  ⚠️  Operation at ${method.toUpperCase()} ${path} has no responses defined`));
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`OpenAPI validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  if (verbose) console.log(chalk.green('  ✅ Specification validation passed'));
}

function extractOpenAPIData(spec: OpenAPIV3.Document, verbose: boolean): ParsedOpenAPI {
  const paths: OpenAPIV3.PathItemObject[] = [];
  const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
  const operations: Array<{
    method: string;
    path: string;
    operation: OpenAPIV3.OperationObject;
    pathItem: OpenAPIV3.PathItemObject;
  }> = [];

  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    if (pathItem && typeof pathItem === 'object' && !Array.isArray(pathItem)) {
      paths.push(pathItem as OpenAPIV3.PathItemObject);
    }
  }

  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      if (isSchemaObject(schema)) {
        schemas[name] = schema;
      }
    }
  }

  for (const [path, pathItem] of Object.entries(spec.paths || {})) {
    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
      if (method === '$ref' || !operation || typeof operation !== 'object') continue;
      
      if (typeof operation === 'object' && !Array.isArray(operation)) {
        operations.push({
          method: method.toUpperCase(),
          path,
          operation: operation as OpenAPIV3.OperationObject,
          pathItem: pathItem as OpenAPIV3.PathItemObject,
        });
      }
    }
  }

  return {
    spec,
    paths,
    schemas,
    operations,
  };
}

export function getOperationResponseSchema(operation: OpenAPIV3.OperationObject): OpenAPIV3.SchemaObject | null {
  const successResponse = operation.responses?.['200'] || operation.responses?.['201'];
  
  if (successResponse && isReferenceObject(successResponse)) {
    return null;
  }
  
  if (successResponse && 'content' in successResponse) {
    const content = (successResponse as OpenAPIV3.ResponseObject).content;
    
    const jsonContent = content?.['application/json'];
    if (jsonContent?.schema && isSchemaObject(jsonContent.schema)) {
      return jsonContent.schema;
    }
    
    const firstContent = content ? Object.values(content)[0] : undefined;
    if (firstContent?.schema && isSchemaObject(firstContent.schema)) {
      return firstContent.schema;
    }
  }
  
  return null;
}

export function getOperationRequestBodySchema(operation: OpenAPIV3.OperationObject): OpenAPIV3.SchemaObject | null {
  const requestBody = operation.requestBody;
  
  if (requestBody && isReferenceObject(requestBody)) {
    return null;
  }
  
  if (requestBody && 'content' in requestBody) {
    const content = (requestBody as OpenAPIV3.RequestBodyObject).content;
    
    const jsonContent = content?.['application/json'];
    if (jsonContent?.schema && isSchemaObject(jsonContent.schema)) {
      return jsonContent.schema;
    }
    
    const firstContent = content ? Object.values(content)[0] : undefined;
    if (firstContent?.schema && isSchemaObject(firstContent.schema)) {
      return firstContent.schema;
    }
  }
  
  return null;
}
