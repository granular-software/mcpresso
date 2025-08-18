# Multi-tenancy

mcpresso supports multi-tenancy through user data injection and scope-based access control.

## User Data Injection

When authentication is enabled, mcpresso automatically injects user data into your handlers. This enables multi-tenant architectures where different users see different data.

## Basic Multi-tenancy

```ts
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  methods: {
    list: {
      handler: async (_, user) => {
        if (!user) throw new Error("Authentication required");
        
        // Filter notes by user ID for multi-tenancy
        return notes.filter(note => note.authorId === user.id);
      },
    },
    create: {
      handler: async (data, user) => {
        if (!user) throw new Error("Authentication required");
        
        // Automatically set author ID from authenticated user
        const newNote = {
          ...data,
          id: generateId(),
          authorId: user.id,
          createdAt: new Date(),
        };
        
        notes.push(newNote);
        return newNote;
      },
    },
  },
});
```

## Scope-based Access Control

Use user scopes to implement different permission levels:

```ts
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  uri_template: "users/{id}",
  methods: {
    list: {
      handler: async (_, user) => {
        if (!user) throw new Error("Authentication required");
        
        // Admin users can see all users
        if (user.scopes.includes('admin')) {
          return users;
        }
        
        // Regular users can only see themselves
        return users.filter(u => u.id === user.id);
      },
    },
    update: {
      handler: async ({ id, ...data }, user) => {
        if (!user) throw new Error("Authentication required");
        
        // Users can only update their own profile
        if (id !== user.id && !user.scopes.includes('admin')) {
          throw new Error("Access denied");
        }
        
        return updateUser(id, data);
      },
    },
  },
});
```

## User Profile Lookup

Configure `userLookup` to fetch rich user profiles from your database:

```ts
const server = createMCPServer({
  name: "multi_tenant_server",
  resources: [userResource, noteResource],
  auth: {
    issuer: "https://auth.example.com",
    serverUrl: "https://api.example.com",
    jwtSecret: "shared-secret",
    userLookup: async (jwtPayload) => {
      // Fetch full user profile including tenant information
      const user = await db.users.findById(jwtPayload.sub);
      if (!user) return null;
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        scopes: user.permissions,
        tenantId: user.tenantId,
        profile: user.profile,
      };
    }
  },
});
```

## Examples

- **Basic Multi-tenancy**: [OAuth2 Simple Demo](../examples_2/oauth2-simple-demo.ts)
- **Scope-based Access**: [Separate Servers Demo](../examples_2/separate-servers-demo.ts) 