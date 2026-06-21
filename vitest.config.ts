import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        "**/{test,tests,__tests__}/**",
      ],
    },
    include: [
      "apps/**/*.{test,spec}.{ts,tsx,js,jsx}",
      "packages/**/*.{test,spec}.{ts,tsx,js,jsx}",
    ],
    exclude: [
      "node_modules",
      "dist",
      ".turbo",
      "**/node_modules/**",
      "**/dist/**",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
