/* eslint-disable no-console */
import { exec } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function resetShadcnComponents() {
	console.log("🔄 Starting shadcn components reset...\n");

	const uiPath = path.join(process.cwd(), "src", "components", "ui");

	let existingComponents: string[] = [];
	try {
		console.log("📋 Detecting existing components...");
		const files = readdirSync(uiPath);
		existingComponents = files
			.filter((file) => file.endsWith(".tsx"))
			.map((file) => file.replace(".tsx", ""))
			.sort((a: string, b: string) => a.localeCompare(b));
		console.log(`✅ Found ${existingComponents.length} components: ${existingComponents.join(", ")}\n`);
	} catch {
		console.log("⚠️  UI directory doesn't exist or couldn't be read\n");
		return;
	}

	if (existingComponents.length === 0) {
		console.log("❌ No components found to reset\n");
		return;
	}

	try {
		console.log("🗑️  Removing existing UI components directory...");
		rmSync(uiPath, { force: true, recursive: true });
		console.log("✅ UI components directory removed\n");
	} catch {
		console.log("⚠️  UI directory couldn't be removed\n");
	}

	console.log("📦 Re-installing shadcn components...\n");

	for (const component of existingComponents) {
		process.stdout.write(`Installing ${component}... `);
		try {
			await execAsync(`pnpm dlx shadcn@latest add ${component} --yes --overwrite`, {
				cwd: process.cwd(),
			});
			console.log("✅");
		} catch (error) {
			console.log("❌");
			console.error(`Failed to install ${component}:`, error instanceof Error ? error.message : error);
		}
	}

	console.log("\n🎉 shadcn components reset complete!");
	console.log("📍 Components installed to: src/components/ui/");
	console.log("\n💡 You may want to run 'pnpm lint:biome' to format the new components");
}

try {
	await resetShadcnComponents();
} catch (error: unknown) {
	console.error("❌ Error resetting shadcn components:", error);
	throw error;
}
