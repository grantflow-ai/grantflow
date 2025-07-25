
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    entry: ["vite.config.ts"],
    ignore: [
        "**/*.spec.{ts,tsx}",
        "**/*.test.{ts,tsx}",
        "**/*.stories.tsx",
        "**/setup.ts",
        "tailwind.config.ts",
        "postcss.config.mjs",
        ".storybook/**",
        "playwright.config.ts",
        "testing/**",
        "dist/**",
        "src/app.tsx",
        "src/main.tsx",
        "eslint.config.js",
        "knip.config.js",
    ],
    ignoreBinaries: ["only-allow", "biome", "cross-env", "storybook", "eslint", "playwright", "vitest", "tsc", "vite"],
    ignoreDependencies: ["@vitejs/plugin-react", "vite", "vite-plugin-dts", "vite-tsconfig-paths", "vitest"],
    ignoreExportsUsedInFile: true,
    project: ["**/*.{ts,tsx,js,jsx}"],
};
exports.default = config;
