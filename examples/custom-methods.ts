/**
 * Custom Methods Example
 * 
 * This example shows how to extend your resources with custom methods beyond
 * the standard CRUD operations. This is useful for implementing business logic,
 * complex queries, or integrations with external services.
 */

import { z } from "zod";
import { createResource, createMCPServer } from "../src/index.js";

// Define the schema for a Task resource
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type Task = z.infer<typeof TaskSchema>;

// In-memory storage
const tasks: Task[] = [];

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Create the task resource with custom methods
const taskResource = createResource({
  name: "task",
  schema: TaskSchema,
  uri_template: "tasks/{id}",
  methods: {
    // Standard CRUD methods are automatically generated
    create: {
      handler: async (args: Partial<Task>) => {
        const task: Task = {
          id: generateId(),
          title: args.title || "",
          description: args.description,
          status: args.status || "todo",
          priority: args.priority || "medium",
          assigneeId: args.assigneeId,
          dueDate: args.dueDate,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        };
        tasks.push(task);
        return task;
      },
    },
    get: {
      handler: async (args: { id: string }) => {
        const task = tasks.find(t => t.id === args.id);
        if (!task) throw new Error("Task not found");
        return task;
      },
    },
    update: {
      handler: async (args: Partial<Task> & { id: string }) => {
        const taskIndex = tasks.findIndex(t => t.id === args.id);
        if (taskIndex === -1) throw new Error("Task not found");
        
        const updatedTask = {
          ...tasks[taskIndex],
          ...args,
          updatedAt: getCurrentTimestamp(),
        };
        tasks[taskIndex] = updatedTask;
        return updatedTask;
      },
    },
    delete: {
      handler: async (args: { id: string }) => {
        const taskIndex = tasks.findIndex(t => t.id === args.id);
        if (taskIndex === -1) throw new Error("Task not found");
        
        const deletedTask = tasks.splice(taskIndex, 1)[0];
        return { success: true, deletedTask };
      },
    },
    list: {
      handler: async () => tasks,
    },
    
    // Custom methods beyond CRUD
    searchByStatus: {
      description: "Find all tasks with a specific status",
      inputSchema: z.object({
        status: z.enum(["todo", "in_progress", "done"]),
      }),
      outputSchema: z.array(TaskSchema),
      handler: async (args: { status: string }) => {
        return tasks.filter(task => task.status === args.status);
      },
    },
    
    searchByAssignee: {
      description: "Find all tasks assigned to a specific user",
      inputSchema: z.object({
        assigneeId: z.string(),
      }),
      outputSchema: z.array(TaskSchema),
      handler: async (args: { assigneeId: string }) => {
        return tasks.filter(task => task.assigneeId === args.assigneeId);
      },
    },
    
    getOverdueTasks: {
      description: "Find all tasks that are past their due date",
      inputSchema: z.object({}),
      outputSchema: z.array(TaskSchema),
      handler: async () => {
        const now = new Date();
        return tasks.filter(task => {
          if (!task.dueDate || task.status === "done") return false;
          return new Date(task.dueDate) < now;
        });
      },
    },
    
    bulkUpdateStatus: {
      description: "Update the status of multiple tasks at once",
      inputSchema: z.object({
        taskIds: z.array(z.string()),
        newStatus: z.enum(["todo", "in_progress", "done"]),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        updatedCount: z.number(),
        errors: z.array(z.string()),
      }),
      handler: async (args: { taskIds: string[]; newStatus: string }) => {
        let updatedCount = 0;
        const errors: string[] = [];
        
        for (const taskId of args.taskIds) {
          try {
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) {
              errors.push(`Task ${taskId} not found`);
              continue;
            }
            
            tasks[taskIndex] = {
              ...tasks[taskIndex],
              status: args.newStatus as any,
              updatedAt: getCurrentTimestamp(),
            };
            updatedCount++;
          } catch (error) {
            errors.push(`Failed to update task ${taskId}: ${error}`);
          }
        }
        
        return {
          success: errors.length === 0,
          updatedCount,
          errors,
        };
      },
    },
    
    getTaskStatistics: {
      description: "Get statistics about all tasks",
      inputSchema: z.object({}),
      outputSchema: z.object({
        total: z.number(),
        byStatus: z.record(z.string(), z.number()),
        byPriority: z.record(z.string(), z.number()),
        overdue: z.number(),
      }),
      handler: async () => {
        const now = new Date();
        const overdue = tasks.filter(task => {
          if (!task.dueDate || task.status === "done") return false;
          return new Date(task.dueDate) < now;
        }).length;
        
        const byStatus = tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const byPriority = tasks.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          total: tasks.length,
          byStatus,
          byPriority,
          overdue,
        };
      },
    },
  },
});

// Create and start the server
const server = createMCPServer({
  name: "custom_methods_server",
  resources: [taskResource],
});

server.listen(3000, () => {
  console.log("Custom methods MCP server running on http://localhost:3000");
  console.log("Available methods:");
  console.log("- Standard CRUD: create, get, update, delete, list");
  console.log("- Custom methods: searchByStatus, searchByAssignee, getOverdueTasks, bulkUpdateStatus, getTaskStatistics");
}); 