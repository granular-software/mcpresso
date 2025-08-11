// import { MCPressoClient } from "../src/client.js";
// import { filterToolsByName, validateMCPServerUrl } from "../src/utils.js";

// describe("MCPressoClient", () => {
// 	let client: MCPressoClient;

// 	beforeEach(() => {
// 		client = new MCPressoClient({
// 			name: "test-client",
// 			version: "1.0.0",
// 		});
// 	});

// 	describe("constructor", () => {
// 		it("should create a client with the provided config", () => {
// 			expect(client).toBeInstanceOf(MCPressoClient);
// 			expect(client.isConnected()).toBe(false);
// 		});
// 	});

// 	describe("isConnected", () => {
// 		it("should return false when not connected", () => {
// 			expect(client.isConnected()).toBe(false);
// 		});
// 	});
// });

// describe("Utility Functions", () => {
// 	describe("filterToolsByName", () => {
// 		it("should filter tools by name pattern", () => {
// 			const tools = [
// 				{ name: "test_tool", description: "A test tool" },
// 				{ name: "other_tool", description: "Another tool" },
// 				{ name: "test_another", description: "Another test tool" },
// 			];

// 			const filtered = filterToolsByName(tools as any, "test");
// 			expect(filtered).toHaveLength(2);
// 			expect(filtered[0].name).toBe("test_tool");
// 			expect(filtered[1].name).toBe("test_another");
// 		});

// 		it("should be case insensitive", () => {
// 			const tools = [
// 				{ name: "Test_Tool", description: "A test tool" },
// 				{ name: "OTHER_TOOL", description: "Another tool" },
// 			];

// 			const filtered = filterToolsByName(tools as any, "test");
// 			expect(filtered).toHaveLength(1);
// 			expect(filtered[0].name).toBe("Test_Tool");
// 		});
// 	});

// 	describe("validateMCPServerUrl", () => {
// 		it("should validate HTTP URLs", () => {
// 			expect(validateMCPServerUrl("http://localhost:3000")).toBe(true);
// 			expect(validateMCPServerUrl("https://example.com")).toBe(true);
// 		});

// 		it("should validate WebSocket URLs", () => {
// 			expect(validateMCPServerUrl("ws://localhost:3000")).toBe(true);
// 			expect(validateMCPServerUrl("wss://example.com")).toBe(true);
// 		});

// 		it("should reject invalid URLs", () => {
// 			expect(validateMCPServerUrl("invalid-url")).toBe(false);
// 			expect(validateMCPServerUrl("ftp://example.com")).toBe(false);
// 		});
// 	});
// });
