/**
 * Multi-Tenancy Example
 * 
 * This example shows how to implement multi-tenancy in your MCP server.
 * Multi-tenancy allows you to serve multiple users/organizations while keeping
 * their data isolated and secure.
 */

import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define schemas for multi-tenant resources
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  organizationId: z.string(),
  role: z.enum(["admin", "user"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  plan: z.enum(["free", "pro", "enterprise"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  organizationId: z.string(),
  createdBy: z.string(),
  status: z.enum(["active", "archived", "deleted"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type User = z.infer<typeof UserSchema>;
type Organization = z.infer<typeof OrganizationSchema>;
type Project = z.infer<typeof ProjectSchema>;

// In-memory storage with organization-based isolation
const users: User[] = [];
const organizations: Organization[] = [];
const projects: Project[] = [];

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Helper function to check if user has access to a resource
function hasAccess(user: User, resourceOrgId: string, requiredRole?: "admin" | "user"): boolean {
  // User must belong to the same organization
  if (user.organizationId !== resourceOrgId) return false;
  
  // Check role requirement if specified
  if (requiredRole && user.role !== requiredRole) return false;
  
  return true;
}

// Helper function to get current user from context
function getCurrentUser(user?: any): User {
  if (!user) throw new Error("Authentication required");
  return user as User;
}

// Create the user resource with multi-tenant access control
const userResource = createResource({
  name: "user",
  schema: UserSchema,
  methods: {
    create: {
      handler: async (args: Partial<User>, user?: any) => {
        const currentUser = getCurrentUser(user);
        
        // Only admins can create users
        if (currentUser.role !== "admin") {
          throw new Error("Insufficient permissions: admin role required");
        }
        
        // Users can only be created in the same organization
        const newUser: User = {
          id: generateId(),
          email: args.email || "",
          name: args.name || "",
          organizationId: currentUser.organizationId, // Force same organization
          role: args.role || "user",
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        };
        
        users.push(newUser);
        return newUser;
      },
    },
    
    read: {
      handler: async (args: { id: string }, user?: any) => {
        const currentUser = getCurrentUser(user);
        const targetUser = users.find(u => u.id === args.id);
        
        if (!targetUser) throw new Error("User not found");
        
        // Users can only read users in their organization
        if (!hasAccess(currentUser, targetUser.organizationId)) {
          throw new Error("Access denied: user not in same organization");
        }
        
        return targetUser;
      },
    },
    
    update: {
      handler: async (args: Partial<User> & { id: string }, user?: any) => {
        const currentUser = getCurrentUser(user);
        const targetUser = users.find(u => u.id === args.id);
        
        if (!targetUser) throw new Error("User not found");
        
        // Users can only update users in their organization
        if (!hasAccess(currentUser, targetUser.organizationId)) {
          throw new Error("Access denied: user not in same organization");
        }
        
        // Only admins can change roles
        if (args.role && currentUser.role !== "admin") {
          throw new Error("Insufficient permissions: admin role required to change roles");
        }
        
        // Prevent changing organization
        if (args.organizationId) {
          throw new Error("Cannot change user organization");
        }
        
        const updatedUser = {
          ...targetUser,
          ...args,
          updatedAt: getCurrentTimestamp(),
        };
        
        const userIndex = users.findIndex(u => u.id === args.id);
        users[userIndex] = updatedUser;
        
        return updatedUser;
      },
    },
    
    delete: {
      handler: async (args: { id: string }, user?: any) => {
        const currentUser = getCurrentUser(user);
        const targetUser = users.find(u => u.id === args.id);
        
        if (!targetUser) throw new Error("User not found");
        
        // Users can only delete users in their organization
        if (!hasAccess(currentUser, targetUser.organizationId)) {
          throw new Error("Access denied: user not in same organization");
        }
        
        // Only admins can delete users
        if (currentUser.role !== "admin") {
          throw new Error("Insufficient permissions: admin role required");
        }
        
        // Prevent self-deletion
        if (currentUser.id === args.id) {
          throw new Error("Cannot delete yourself");
        }
        
        const userIndex = users.findIndex(u => u.id === args.id);
        const deletedUser = users.splice(userIndex, 1)[0];
        
        return { success: true, deletedUser };
      },
    },
    
    list: {
      handler: async (args: {}, user?: any) => {
        const currentUser = getCurrentUser(user);
        
        // Users can only see users in their organization
        return users.filter(u => u.organizationId === currentUser.organizationId);
      },
    },
    
    // Custom method for organization management
    getOrganizationUsers: {
      description: "Get all users in the current user's organization",
      inputSchema: z.object({}),
      outputSchema: z.array(UserSchema),
      handler: async (args: {}, user?: any) => {
        const currentUser = getCurrentUser(user);
        return users.filter(u => u.organizationId === currentUser.organizationId);
      },
    },
  },
});

// Create the project resource with multi-tenant access control
const projectResource = createResource({
  name: "project",
  schema: ProjectSchema,
  methods: {
    create: {
      handler: async (args: Partial<Project>, user?: any) => {
        const currentUser = getCurrentUser(user);
        
        const project: Project = {
          id: generateId(),
          name: args.name || "",
          description: args.description,
          organizationId: currentUser.organizationId, // Force same organization
          createdBy: currentUser.id,
          status: "active",
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        };
        
        projects.push(project);
        return project;
      },
    },
    
    read: {
      handler: async (args: { id: string }, user?: any) => {
        const currentUser = getCurrentUser(user);
        const project = projects.find(p => p.id === args.id);
        
        if (!project) throw new Error("Project not found");
        
        // Users can only read projects in their organization
        if (!hasAccess(currentUser, project.organizationId)) {
          throw new Error("Access denied: project not in same organization");
        }
        
        return project;
      },
    },
    
    update: {
      handler: async (args: Partial<Project> & { id: string }, user?: any) => {
        const currentUser = getCurrentUser(user);
        const project = projects.find(p => p.id === args.id);
        
        if (!project) throw new Error("Project not found");
        
        // Users can only update projects in their organization
        if (!hasAccess(currentUser, project.organizationId)) {
          throw new Error("Access denied: project not in same organization");
        }
        
        // Prevent changing organization
        if (args.organizationId) {
          throw new Error("Cannot change project organization");
        }
        
        const updatedProject = {
          ...project,
          ...args,
          updatedAt: getCurrentTimestamp(),
        };
        
        const projectIndex = projects.findIndex(p => p.id === args.id);
        projects[projectIndex] = updatedProject;
        
        return updatedProject;
      },
    },
    
    delete: {
      handler: async (args: { id: string }, user?: any) => {
        const currentUser = getCurrentUser(user);
        const project = projects.find(p => p.id === args.id);
        
        if (!project) throw new Error("Project not found");
        
        // Users can only delete projects in their organization
        if (!hasAccess(currentUser, project.organizationId)) {
          throw new Error("Access denied: project not in same organization");
        }
        
        // Only project creator or admins can delete
        if (project.createdBy !== currentUser.id && currentUser.role !== "admin") {
          throw new Error("Insufficient permissions: only project creator or admin can delete");
        }
        
        const projectIndex = projects.findIndex(p => p.id === args.id);
        const deletedProject = projects.splice(projectIndex, 1)[0];
        
        return { success: true, deletedProject };
      },
    },
    
    list: {
      handler: async (args: {}, user?: any) => {
        const currentUser = getCurrentUser(user);
        
        // Users can only see projects in their organization
        return projects.filter(p => p.organizationId === currentUser.organizationId);
      },
    },
    
    // Custom method for project analytics
    getProjectStats: {
      description: "Get statistics about projects in the current organization",
      inputSchema: z.object({}),
      outputSchema: z.object({
        total: z.number(),
        active: z.number(),
        archived: z.number(),
        byCreator: z.record(z.string(), z.number()),
      }),
      handler: async (args: {}, user?: any) => {
        const currentUser = getCurrentUser(user);
        const orgProjects = projects.filter(p => p.organizationId === currentUser.organizationId);
        
        const byCreator = orgProjects.reduce((acc, project) => {
          acc[project.createdBy] = (acc[project.createdBy] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          total: orgProjects.length,
          active: orgProjects.filter(p => p.status === "active").length,
          archived: orgProjects.filter(p => p.status === "archived").length,
          byCreator,
        };
      },
    },
  },
});

// Create and start the server
const server = createMCPServer({
  name: "multi_tenant_server",
  resources: [userResource, projectResource],
  auth: {
    type: "bearer",
    validateToken: async (token: string) => {
      // In a real app, you'd validate the JWT token here
      // For demo purposes, we'll simulate a user lookup
      const user = users.find(u => u.id === token);
      if (!user) throw new Error("Invalid token");
      return user;
    },
  },
});

server.listen(3000, () => {
  console.log("Multi-tenant MCP server running on http://localhost:3000");
  console.log("Features:");
  console.log("- Organization-based data isolation");
  console.log("- Role-based access control (admin/user)");
  console.log("- User data injection for multi-tenancy");
  console.log("- Scope-based access control");
}); 