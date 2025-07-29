// Test setup configuration for MCPresso end-to-end tests

// Increase timeout for end-to-end tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless there's an error
  log: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error logging
  info: jest.fn(),
  debug: jest.fn(),
};

// Helper function to wait for server to be ready
export const waitForServer = (server: any, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, timeout);

    server.on('listening', () => {
      clearTimeout(timer);
      resolve();
    });

    server.on('error', (error: any) => {
      clearTimeout(timer);
      reject(error);
    });
  });
};

// Helper function to create a test user
export const createTestUser = (name: string, email: string) => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name,
  email,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Helper function to create a test post
export const createTestPost = (title: string, content: string, authorId: string) => ({
  id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title,
  content,
  authorId,
  viewCount: 0,
  likeCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Helper function to create a test comment
export const createTestComment = (content: string, postId: string, authorId: string) => ({
  id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  content,
  postId,
  authorId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Mock data for testing
export const mockUsers = [
  createTestUser("John Doe", "john@example.com"),
  createTestUser("Jane Smith", "jane@example.com"),
  createTestUser("Bob Johnson", "bob@example.com"),
];

export const mockPosts = [
  createTestPost("First Post", "This is the first post content", mockUsers[0].id),
  createTestPost("Second Post", "This is the second post content", mockUsers[0].id),
  createTestPost("Third Post", "This is the third post content", mockUsers[1].id),
];

export const mockComments = [
  createTestComment("Great post!", mockPosts[0].id, mockUsers[1].id),
  createTestComment("Interesting content", mockPosts[0].id, mockUsers[2].id),
  createTestComment("Thanks for sharing", mockPosts[1].id, mockUsers[1].id),
]; 