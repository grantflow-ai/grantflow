import { exec } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const SHADCN_COMPONENTS = [
	"accordion",
	"alert-dialog",
	"alert",
	"aspect-ratio",
	"avatar",
	"badge",
	"breadcrumb",
	"button",
	"calendar",
	"card",
	"carousel",
	"chart",
	"checkbox",
	"collapsible",
	"command",
	"context-menu",
	"data-table",
	"date-picker",
	"dialog",
	"drawer",
	"dropdown-menu",
	"form",
	"hover-card",
	"input-otp",
	"input",
	"label",
	"menubar",
	"navigation-menu",
	"pagination",
	"popover",
	"progress",
	"radio-group",
	"resizable",
	"scroll-area",
	"select",
	"separator",
	"sheet",
	"sidebar",
	"skeleton",
	"slider",
	"sonner",
	"switch",
	"table",
	"tabs",
	"textarea",
	"toast",
	"toggle-group",
	"toggle",
	"tooltip",
];

async function resetShadcnComponents() {
	console.log("🔄 Starting shadcn components reset...\n");

	const uiPath = join(process.cwd(), "src", "components", "ui");

	try {
		console.log("🗑️  Removing existing UI components directory...");
		rmSync(uiPath, { force: true, recursive: true });
		console.log("✅ UI components directory removed\n");
	} catch {
		console.log("⚠️  UI directory doesn't exist or couldn't be removed\n");
	}

	console.log("📦 Installing all shadcn components...\n");

	for (const component of SHADCN_COMPONENTS) {
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

resetShadcnComponents().catch((error) => {
	console.error("❌ Error resetting shadcn components:", error);
	process.exit(1);
});
