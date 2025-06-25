#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { generateFromOpenAPI } from "./cli/generator.js";
import { parseOpenAPI } from "./cli/openapi-parser.js";
import { initializeProject } from "./cli/project-initializer.js";

const program = new Command();

program.name("mcpresso").description("CLI for generating MCPresso servers from OpenAPI specifications").version("0.2.3");

program
	.command("generate")
	.description("Generate a MCPresso server from an OpenAPI specification")
	.argument("<source>", "OpenAPI specification file path or URL")
	.option("-o, --output <directory>", "Output directory for generated code", "./generated-mcpresso")
	.option("-n, --name <name>", "Server name", "generated-server")
	.option("-v, --verbose", "Enable verbose logging")
	.option("--no-format", "Skip code formatting")
	.action(async (source, options) => {
		try {
			console.log(chalk.blue("🚀 MCPresso CLI - OpenAPI to MCPresso Generator"));
			console.log(chalk.gray(`Source: ${source}`));
			console.log(chalk.gray(`Output: ${options.output}`));
			console.log(chalk.gray(`Server: ${options.name}`));
			console.log("");

			await generateFromOpenAPI({
				source,
				outputDir: options.output,
				serverName: options.name,
				verbose: options.verbose,
				format: options.format,
			});

			console.log(chalk.green("✅ Generation completed successfully!"));
			console.log(chalk.blue(`📁 Generated files in: ${options.output}`));
			console.log(chalk.blue("🚀 Run the server with: bun run start"));
		} catch (error) {
			console.error(chalk.red("❌ Generation failed:"), error);
			process.exit(1);
		}
	});

program
	.command("init")
	.description("Initialize a new MCPresso project")
	.option("-n, --name <name>", "Project name", "my-mcpresso-server")
	.option("-o, --output <directory>", "Output directory", ".")
	.option("-v, --verbose", "Enable verbose logging")
	.action(async (options) => {
		try {
			console.log(chalk.blue("🚀 MCPresso CLI - Project Initialization"));
			console.log(chalk.gray(`Project: ${options.name}`));
			console.log(chalk.gray(`Directory: ${options.output}`));
			console.log("");

			await initializeProject(options);

			console.log(chalk.green("✅ Project initialized successfully!"));
			console.log(chalk.blue(`📁 Project created in: ${options.output}/${options.name}`));
			console.log(chalk.blue("🚀 Next steps:"));
			console.log(chalk.gray(`  1. cd ${options.name}`));
			console.log(chalk.gray(`  2. npm install`));
			console.log(chalk.gray(`  3. npm start`));
		} catch (error) {
			console.error(chalk.red("❌ Initialization failed:"), error);
			process.exit(1);
		}
	});

program
	.command("validate")
	.description("Validate an OpenAPI specification")
	.argument("<source>", "OpenAPI specification file path or URL")
	.option("-v, --verbose", "Enable verbose logging")
	.action(async (source, options) => {
		try {
			console.log(chalk.blue("🔍 MCPresso CLI - OpenAPI Validation"));
			console.log(chalk.gray(`Source: ${source}`));
			console.log("");

			const parsed = await parseOpenAPI({ source, verbose: options.verbose });

			console.log(chalk.green("✅ OpenAPI specification is valid!"));
			console.log(chalk.blue(`📊 Summary:`));
			console.log(chalk.gray(`  - Paths: ${parsed.paths.length}`));
			console.log(chalk.gray(`  - Operations: ${parsed.operations.length}`));
			console.log(chalk.gray(`  - Schemas: ${Object.keys(parsed.schemas).length}`));

			if (parsed.spec.info) {
				console.log(chalk.blue(`📋 API Info:`));
				console.log(chalk.gray(`  - Title: ${parsed.spec.info.title || "N/A"}`));
				console.log(chalk.gray(`  - Version: ${parsed.spec.info.version || "N/A"}`));
				console.log(chalk.gray(`  - Description: ${parsed.spec.info.description ? "Yes" : "No"}`));
			}

			if (parsed.spec.servers && parsed.spec.servers.length > 0) {
				console.log(chalk.blue(`🌐 Servers: ${parsed.spec.servers.length}`));
			}
		} catch (error) {
			console.error(chalk.red("❌ Validation failed:"), error);
			process.exit(1);
		}
	});

program.parse();
