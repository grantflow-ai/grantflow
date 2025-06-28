import { exec } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { log } from "@/utils/logger";

const execAsync = promisify(exec);

async function resetShadcnComponents() {
	log.info("🔄 Starting shadcn components reset...\n");

	const uiPath = path.join(process.cwd(), "src", "components", "ui");

	let existingComponents: string[] = [];
	try {
		log.info("📋 Detecting existing components...");
		const files = readdirSync(uiPath);
		existingComponents = files
			.filter((file) => file.endsWith(".tsx"))
			.map((file) => file.replace(".tsx", ""))
			.sort((a: string, b: string) => a.localeCompare(b));
		log.info(`✅ Found ${existingComponents.length} components: ${existingComponents.join(", ")}\n`);
	} catch {
		log.info("⚠️  UI directory doesn't exist or couldn't be read\n");
		return;
	}

	if (existingComponents.length === 0) {
		log.info("❌ No components found to reset\n");
		return;
	}

	try {
		log.info("🗑️  Removing existing UI components directory...");
		rmSync(uiPath, { force: true, recursive: true });
		log.info("✅ UI components directory removed\n");
	} catch {
		log.info("⚠️  UI directory couldn't be removed\n");
	}

	log.info("📦 Re-installing shadcn components...\n");

	for (const component of existingComponents) {
		process.stdout.write(`Installing ${component}... `);
		try {
			await execAsync(`pnpm dlx shadcn@latest add ${component} --yes --overwrite`, {
				cwd: process.cwd(),
			});
			log.info("✅");
		} catch (error) {
			log.info("❌");
			log.error(`Failed to install ${component}:`, error instanceof Error ? error.message : error);
		}
	}

	log.info("\n🎉 shadcn components reset complete!");
	log.info("📍 Components installed to: src/components/ui/");
	log.info("\n💡 You may want to run 'pnpm lint:biome' to format the new components");
}

try {
	await resetShadcnComponents();
} catch (error: unknown) {
	log.error("❌ Error resetting shadcn components:", error);
	throw error;
}
