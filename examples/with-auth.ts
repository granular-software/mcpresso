/**
 * With Authentication - Bearer Token
 * 
 * This example shows how to add simple authentication to your MCP server.
 * Uses bearer token authentication for internal APIs and services.
 */

import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define your data model
const NoteSchema = z.object({
  id: z.string().readonly(),
  title: z.string().min(1, "Title is required"),
  content: z.string(),
  authorId: z.string().readonly(),
  createdAt: z.date().readonly(),
});

// In-memory storage
const notes: z.infer<typeof NoteSchema>[] = [];

// Helper function
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Create a note resource
const noteResource = createResource({
  name: "note",
  schema: NoteSchema,
  uri_template: "notes/{id}",
  methods: {
    get: {
      description: "Retrieve a note by ID",
      handler: async ({ id }, user) => {
        // user contains the authenticated user profile
        if (!user) throw new Error("Authentication required");
        
        const note = notes.find(n => n.id === id);
        if (!note) throw new Error(`Note ${id} not found`);
        
        // Users can only see their own notes
        if (note.authorId !== user.id) {
          throw new Error("Access denied");
        }
        
        return note;
      },
    },
    
    list: {
      description: "List all notes for the authenticated user",
      handler: async (_, user) => {
        if (!user) throw new Error("Authentication required");
        
        // Return only notes belonging to the authenticated user
        return notes.filter(note => note.authorId === user.id);
      },
    },
    
    create: {
      description: "Create a new note",
      handler: async (data, user) => {
        if (!user) throw new Error("Authentication required");
        
        if (!data.title || !data.content) {
          throw new Error("Title and content are required");
        }
        
        const newNote: z.infer<typeof NoteSchema> = {
          id: generateId(),
          title: data.title,
          content: data.content,
          authorId: user.id, // Automatically set from authenticated user
          createdAt: new Date(),
        };
        
        notes.push(newNote);
        return newNote;
      },
    },
    
    update: {
      description: "Update an existing note",
      handler: async ({ id, ...data }, user) => {
        if (!user) throw new Error("Authentication required");
        
        const note = notes.find(n => n.id === id);
        if (!note) throw new Error(`Note ${id} not found`);
        
        // Users can only update their own notes
        if (note.authorId !== user.id) {
          throw new Error("Access denied");
        }
        
        Object.assign(note, data);
        return note;
      },
    },
    
    delete: {
      description: "Delete a note",
      handler: async ({ id }, user) => {
        if (!user) throw new Error("Authentication required");
        
        const index = notes.findIndex(n => n.id === id);
        if (index === -1) throw new Error(`Note ${id} not found`);
        
        const note = notes[index];
        
        // Users can only delete their own notes
        if (note.authorId !== user.id) {
          throw new Error("Access denied");
        }
        
        const deleted = notes.splice(index, 1)[0];
        return { success: true, deleted };
      },
    },
  },
});

// Create server with bearer token authentication
const server = createMCPServer({
  name: "auth_server",
  resources: [noteResource],
  auth: {
    bearerToken: {
      token: "sk-1234567890abcdef", // In production, use environment variables
      userProfile: {
        id: "user-123",
        username: "demo-user",
        email: "demo@example.com",
        scopes: ["read", "write"],
      },
    },
  },
});

server.listen(3000, () => {
  console.log("Authentication Server running at http://localhost:3000");
  console.log("");
  console.log("Authentication:");
  console.log("  • Bearer token: sk-1234567890abcdef");
  console.log("  • User: demo-user (user-123)");
  console.log("");
  console.log("Available MCP Tools:");
  console.log("  • get_note - Retrieve a note (requires auth)");
  console.log("  • list_notes - List user's notes (requires auth)");
  console.log("  • create_note - Create a note (requires auth)");
  console.log("  • update_note - Update a note (requires auth)");
  console.log("  • delete_note - Delete a note (requires auth)");
  console.log("");
  console.log("Try creating a note:");
  console.log("  create_note({ title: 'My First Note', content: 'Hello World!' })");
  console.log("");
  console.log("Note: All requests require the Authorization header:");
  console.log("  Authorization: Bearer sk-1234567890abcdef");
}); 