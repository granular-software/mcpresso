# MCPresso Generator Guide

This guide explains how the MCPresso code generator works and how to use it to scaffold a fully-typed MCPresso server from an OpenAPI specification.

---

## What is the MCPresso Generator?

The MCPresso generator is a CLI tool that takes an OpenAPI (Swagger) specification and produces a ready-to-run TypeScript server using the [MCPresso](https://github.com/granular-software/mcpresso) library. It:

- Parses your OpenAPI spec (YAML or JSON, local file or URL)
- Converts OpenAPI schemas to [Zod](https://zod.dev/) schemas for type safety
- Generates resource definitions and handlers for each operation
- Produces a server entry point, types, and a package.json
- Optionally exposes server metadata and resource types for AI/agent discovery

---

## How It Works

1. **Parse OpenAPI Spec**: The CLI reads and validates your OpenAPI file, resolving all references.
2. **Schema Conversion**: All schemas in `components.schemas` are converted to Zod schemas.
3. **Resource Mapping**: Paths and operations are grouped into resources, with CRUD methods auto-detected.
4. **Code Generation**: The generator writes:
    - `server.js` (or `server.ts` if using TypeScript)
    - `types.ts` (all Zod schemas and TypeScript types)
    - `package.json` (with dependencies)
    - `README.md` (usage instructions)
5. **Customization**: You can edit the generated code to add business logic, authentication, or custom handlers.

---

## Usage

### 1. Install MCPresso (if not already)

```bash
npm install -g mcpresso
```

### 2. Run the Generator

You can generate a server from a local OpenAPI file or a URL:

```bash
mcpresso generate ./openapi.yaml --output ./my-mcp-server --name my-server
```

**Options:**
- `-o, --output <directory>`: Output directory (default: `./generated-mcpresso`)
- `-n, --name <name>`: Server name (default: `generated-server`)
- `-v, --verbose`: Enable verbose logging
- `--no-format`: Skip code formatting

### 3. Install Dependencies & Run

```bash
cd my-mcp-server
npm install
npm start
```

The server will be available at [http://localhost:3080](http://localhost:3080).

---

## Example: From OpenAPI to MCPresso Server

Suppose you have the following OpenAPI YAML (`petstore.yaml`):

```yaml
openapi: 3.0.0
info:
  title: Petstore API
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      responses:
        '200':
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
    post:
      summary: Create a pet
      operationId: createPet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Pet'
      responses:
        '201':
          description: The created pet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
  /pets/{id}:
    get:
      summary: Get a pet by ID
      operationId: getPet
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: A pet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
        name:
          type: string
        tag:
          type: string
```

Run:

```bash
mcpresso generate ./petstore.yaml --output ./petstore-server --name petstore
cd petstore-server
npm install
npm start
```

**Result:**
- A new directory `petstore-server/` with a ready-to-run MCPresso server
- All endpoints and schemas mapped to Zod and MCPresso resources
- Type-safe handlers for each operation (with TODOs for your logic)

---

## Customization & Next Steps

- Edit the generated `server.js` (or `server.ts`) to add your business logic
- Implement authentication, rate limiting, or retries as needed
- Add new resources or methods by editing the code
- Use the generated `types.ts` for type-safe development

---

## Troubleshooting

- If you encounter errors, use the `--verbose` flag for more details
- Make sure your OpenAPI spec is valid (use `mcpresso validate <file>`)
- For advanced customization, see the [main README](../README.md) and library docs

---

## More Resources
- [MCPresso GitHub](https://github.com/granular-software/mcpresso)
- [Zod Documentation](https://zod.dev/)
- [OpenAPI Specification](https://swagger.io/specification/) 