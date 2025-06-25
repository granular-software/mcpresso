import { z } from 'zod';
import type { OpenAPIV3 } from 'openapi-types';
import chalk from 'chalk';

export interface ConvertedSchema {
  name: string;
  schema: z.ZodTypeAny;
  description?: string;
  examples?: any[];
  warnings?: string[];
}

export interface SchemaConversionOptions {
  verbose?: boolean;
  includeExamples?: boolean;
  strictMode?: boolean;
  detectReadonly?: boolean;
  warnings?: string[];
}

/**
 * Convert OpenAPI schemas to Zod schemas.
 */
export function convertOpenAPISchemasToZod(
  schemas: Record<string, OpenAPIV3.SchemaObject>,
  options: SchemaConversionOptions = {}
): ConvertedSchema[] {
  const converted: ConvertedSchema[] = [];
  const processed = new Set<string>();
  const warnings: string[] = [];
  
  // Add warnings to options
  const optionsWithWarnings = { ...options, warnings };

  if (options.verbose) {
    console.log(chalk.blue(`🔄 Converting ${Object.keys(schemas).length} OpenAPI schemas to Zod...`));
  }

  for (const [name, schema] of Object.entries(schemas)) {
    try {
      const convertedSchema = convertSchemaToZod(name, schema, schemas, processed, optionsWithWarnings);
      if (convertedSchema) {
        converted.push(convertedSchema);
        if (options.verbose) {
          console.log(chalk.green(`  ✅ Converted: ${name}`));
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.log(chalk.yellow(`  ⚠️  Failed to convert ${name}: ${String(error)}`));
      }
      if (options.strictMode) {
        throw error;
      }
    }
  }

  if (options.verbose) {
    console.log(chalk.green(`✅ Successfully converted ${converted.length} schemas`));
  }

  // Add warnings to the first schema if any exist
  if (warnings.length > 0 && converted.length > 0) {
    converted[0].warnings = warnings;
  }

  return converted;
}

/**
 * Convert a single OpenAPI schema to a Zod schema.
 */
function convertSchemaToZod(
  name: string,
  schema: OpenAPIV3.SchemaObject,
  allSchemas: Record<string, OpenAPIV3.SchemaObject>,
  processed: Set<string>,
  options: SchemaConversionOptions
): ConvertedSchema | null {
  if (processed.has(name)) {
    return null;
  }
  processed.add(name);

  let zodSchema: z.ZodTypeAny = z.any(); // Default fallback
  let description = schema.description;
  let examples: any[] = [];

  // Handle $ref schemas
  if ('$ref' in schema && typeof schema.$ref === 'string') {
    const refName = extractRefName(schema.$ref);
    const refSchema = allSchemas[refName];
    if (refSchema) {
      const converted = convertSchemaToZod(refName, refSchema, allSchemas, processed, options);
      if (converted) {
        return converted;
      }
    } else {
      if (options.warnings) {
        options.warnings.push(`// Warning: Schema '${refName}' not found. Using z.any().`);
      }
      zodSchema = z.any();
    }
  } else {
    // Convert based on type
    if (schema.enum) {
      zodSchema = convertEnumSchema(schema);
    } else if (schema.type === 'string') {
      zodSchema = convertStringSchema(schema);
    } else if (schema.type === 'number' || schema.type === 'integer') {
      zodSchema = convertNumberSchema(schema);
    } else if (schema.type === 'boolean') {
      zodSchema = convertBooleanSchema(schema);
    } else if (schema.type === 'array') {
      zodSchema = convertArraySchema(schema as OpenAPIV3.ArraySchemaObject, allSchemas, processed, options);
    } else if (schema.type === 'object' || schema.properties || schema.additionalProperties !== undefined) {
      zodSchema = convertObjectSchema(schema, allSchemas, processed, options);
    } else if (schema.oneOf || schema.anyOf || schema.allOf) {
      zodSchema = convertUnionSchema(schema, allSchemas, processed, options);
    } else {
      // Fallback for unknown types
      zodSchema = z.any();
    }
  }

  // Include examples if requested
  if (options.includeExamples && schema.example) {
    examples = [schema.example];
  }

  return {
    name,
    schema: zodSchema,
    description,
    examples,
  };
}

/**
 * Convert OpenAPI string schema to Zod.
 */
function convertStringSchema(schema: OpenAPIV3.SchemaObject): z.ZodString {
  let zodString = z.string();

  // Handle format
  if (schema.format) {
    switch (schema.format) {
      case 'email':
        zodString = z.string().email();
        break;
      case 'uri':
        zodString = z.string().url();
        break;
      case 'date':
        zodString = z.string().datetime();
        break;
      case 'date-time':
        zodString = z.string().datetime();
        break;
      case 'uuid':
        zodString = z.string().uuid();
        break;
      case 'ipv4':
        zodString = z.string().ip({ version: 'v4' });
        break;
      case 'ipv6':
        zodString = z.string().ip({ version: 'v6' });
        break;
      case 'regex':
        if (schema.pattern) {
          zodString = z.string().regex(new RegExp(schema.pattern));
        }
        break;
    }
  }

  // Handle pattern
  if (schema.pattern && schema.format !== 'regex') {
    zodString = zodString.regex(new RegExp(schema.pattern));
  }

  // Handle min/max length
  if (schema.minLength !== undefined) {
    zodString = zodString.min(schema.minLength);
  }
  if (schema.maxLength !== undefined) {
    zodString = zodString.max(schema.maxLength);
  }

  return zodString;
}

/**
 * Convert OpenAPI number/integer schema to Zod.
 */
function convertNumberSchema(schema: OpenAPIV3.SchemaObject): z.ZodNumber {
  let zodNumber = schema.type === 'integer' ? z.number().int() : z.number();

  // Handle format
  if (schema.format) {
    switch (schema.format) {
      case 'float':
        zodNumber = z.number();
        break;
      case 'double':
        zodNumber = z.number();
        break;
      case 'int32':
        zodNumber = z.number().int();
        break;
      case 'int64':
        zodNumber = z.number().int();
        break;
    }
  }

  // Handle min/max
  if (schema.minimum !== undefined) {
    zodNumber = schema.exclusiveMinimum ? 
      zodNumber.gt(schema.minimum) : 
      zodNumber.gte(schema.minimum);
  }
  if (schema.maximum !== undefined) {
    zodNumber = schema.exclusiveMaximum ? 
      zodNumber.lt(schema.maximum) : 
      zodNumber.lte(schema.maximum);
  }

  // Handle multipleOf
  if (schema.multipleOf !== undefined) {
    // Note: Zod doesn't have a direct multipleOf equivalent
    // This would need custom refinement
  }

  return zodNumber;
}

/**
 * Convert OpenAPI boolean schema to Zod.
 */
function convertBooleanSchema(schema: OpenAPIV3.SchemaObject): z.ZodBoolean {
  return z.boolean();
}

/**
 * Convert OpenAPI array schema to Zod.
 */
function convertArraySchema(
  schema: OpenAPIV3.ArraySchemaObject,
  allSchemas: Record<string, OpenAPIV3.SchemaObject>,
  processed: Set<string>,
  options: SchemaConversionOptions
): z.ZodArray<any> {
  let itemSchema: z.ZodTypeAny = z.any();

  if (schema.items) {
    if ('$ref' in schema.items) {
      // Handle $ref in array items
      const refName = extractRefName(schema.items.$ref);
      const refSchema = allSchemas[refName];
      if (refSchema) {
        const converted = convertSchemaToZod(refName, refSchema, allSchemas, processed, options);
        itemSchema = converted?.schema || z.any();
      }
    } else {
      itemSchema = convertSchemaToZod('array_item', schema.items, allSchemas, processed, options)?.schema || z.any();
    }
  }

  let zodArray = z.array(itemSchema);

  // Handle min/max items
  if (schema.minItems !== undefined) {
    zodArray = zodArray.min(schema.minItems);
  }
  if (schema.maxItems !== undefined) {
    zodArray = zodArray.max(schema.maxItems);
  }

  // Handle uniqueItems
  if (schema.uniqueItems) {
    zodArray = zodArray.refine(
      (arr) => arr.length === new Set(arr).size,
      { message: 'Array items must be unique' }
    ) as unknown as z.ZodArray<any>;
  }

  return zodArray;
}

/**
 * Convert OpenAPI object schema to Zod.
 */
function convertObjectSchema(
  schema: OpenAPIV3.SchemaObject,
  allSchemas: Record<string, OpenAPIV3.SchemaObject>,
  processed: Set<string>,
  options: SchemaConversionOptions
): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      let convertedSchema: z.ZodTypeAny;
      
      if ('$ref' in propSchema) {
        // Handle $ref in properties
        const refName = extractRefName(propSchema.$ref);
        const refSchema = allSchemas[refName];
        if (refSchema) {
          const converted = convertSchemaToZod(refName, refSchema, allSchemas, processed, options);
          convertedSchema = converted?.schema || z.any();
        } else {
          convertedSchema = z.any();
          if (options.warnings) {
            options.warnings.push(`// Warning: Schema '${refName}' referenced by '${propName}' not found. Using z.any().`);
          }
        }
      } else {
        const converted = convertSchemaToZod(`${propName}_prop`, propSchema, allSchemas, processed, options);
        convertedSchema = converted?.schema || z.any();
      }

      // Check if property should be readonly
      const isReadonly = options.detectReadonly !== false && (
        // Check for readOnly: true in OpenAPI
        (propSchema as any).readOnly === true ||
        // Check for x-readonly extension
        (propSchema as any)['x-readonly'] === true ||
        // Common readonly field patterns
        ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(propName) ||
        // Fields that typically end with 'Id' are often readonly references
        propName.endsWith('Id') && propName !== 'authorId' && propName !== 'userId'
      );

      if (isReadonly) {
        shape[propName] = convertedSchema.readonly();
      } else {
        shape[propName] = convertedSchema;
      }
    }
  }

  let zodObject = z.object(shape);

  // Handle required properties
  if (schema.required && schema.required.length > 0) {
    // Zod objects are strict by default, so we need to make optional properties explicit
    const optionalShape: Record<string, z.ZodTypeAny> = {};
    for (const [propName, propSchema] of Object.entries(shape)) {
      if (!schema.required.includes(propName)) {
        optionalShape[propName] = propSchema.optional();
      } else {
        optionalShape[propName] = propSchema;
      }
    }
    zodObject = z.object(optionalShape);
  }

  // Handle additionalProperties
  if (schema.additionalProperties === false) {
    // Note: strict() is not available in this Zod version, skip it
    // zodObject = zodObject.strict() as unknown as z.ZodObject<any>;
  } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object' && !('$ref' in schema.additionalProperties)) {
    // Handle additionalProperties with schema
    const additionalSchema = convertSchemaToZod('additional', schema.additionalProperties, allSchemas, processed, options);
    if (additionalSchema) {
      zodObject = zodObject.catchall(additionalSchema.schema);
    }
  }

  return zodObject;
}

/**
 * Convert OpenAPI enum schema to Zod.
 */
function convertEnumSchema(schema: OpenAPIV3.SchemaObject): z.ZodTypeAny {
  if (schema.enum && schema.enum.length > 0) {
    // Use z.union with z.literal for better compatibility
    if (schema.enum.length === 1) {
      return z.literal(schema.enum[0]);
    }
    // Create union of literals
    const literals = schema.enum.map(value => z.literal(value));
    return z.union(literals as [z.ZodLiteral<string>, z.ZodLiteral<string>, ...z.ZodLiteral<string>[]]);
  }
  return z.string(); // Fallback
}

/**
 * Convert OpenAPI union schemas (oneOf, anyOf, allOf) to Zod.
 */
function convertUnionSchema(
  schema: OpenAPIV3.SchemaObject,
  allSchemas: Record<string, OpenAPIV3.SchemaObject>,
  processed: Set<string>,
  options: SchemaConversionOptions
): z.ZodTypeAny {
  const schemas: z.ZodTypeAny[] = [];

  if (schema.oneOf) {
    for (const unionSchema of schema.oneOf) {
      if ('$ref' in unionSchema) {
        const refName = extractRefName(unionSchema.$ref);
        const refSchema = allSchemas[refName];
        if (refSchema) {
          const converted = convertSchemaToZod(refName, refSchema, allSchemas, processed, options);
          if (converted) schemas.push(converted.schema);
        }
      } else {
        const converted = convertSchemaToZod('union_item', unionSchema, allSchemas, processed, options);
        if (converted) schemas.push(converted.schema);
      }
    }
    if (schemas.length === 0) {
      return z.any();
    }
    if (schemas.length === 1) {
      return schemas[0];
    }
    return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  if (schema.anyOf) {
    for (const unionSchema of schema.anyOf) {
      if ('$ref' in unionSchema) {
        const refName = extractRefName(unionSchema.$ref);
        const refSchema = allSchemas[refName];
        if (refSchema) {
          const converted = convertSchemaToZod(refName, refSchema, allSchemas, processed, options);
          if (converted) schemas.push(converted.schema);
        }
      } else {
        const converted = convertSchemaToZod('union_item', unionSchema, allSchemas, processed, options);
        if (converted) schemas.push(converted.schema);
      }
    }
    if (schemas.length === 0) {
      return z.any();
    }
    if (schemas.length === 1) {
      return schemas[0];
    }
    return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }

  if (schema.allOf) {
    // allOf is like intersection in Zod
    for (const intersectionSchema of schema.allOf) {
      if ('$ref' in intersectionSchema) {
        const refName = extractRefName(intersectionSchema.$ref);
        const refSchema = allSchemas[refName];
        if (refSchema) {
          const converted = convertSchemaToZod(refName, refSchema, allSchemas, processed, options);
          if (converted) schemas.push(converted.schema);
        }
      } else {
        const converted = convertSchemaToZod('intersection_item', intersectionSchema, allSchemas, processed, options);
        if (converted) schemas.push(converted.schema);
      }
    }
    if (schemas.length === 0) {
      return z.any();
    }
    if (schemas.length < 2) {
      return schemas[0] || z.any();
    }
    return z.intersection(schemas[0], schemas[1], ...schemas.slice(2));
  }

  return z.any();
}

/**
 * Extract schema name from $ref string.
 */
function extractRefName(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

/**
 * Generate TypeScript type definitions from converted schemas.
 */
export function generateTypeScriptTypes(schemas: ConvertedSchema[]): string {
  const typeDefinitions: string[] = [];

  for (const { name, schema } of schemas) {
    const typeName = toPascalCase(name);
    const zodType = `z.infer<typeof ${name}Schema>`;
    typeDefinitions.push(`export type ${typeName} = ${zodType};`);
  }

  return typeDefinitions.join('\n');
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