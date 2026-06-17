import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Scoped to first-party source so `vitest run` does not try to execute the
 * bundled tests inside node_modules. The `@/...` alias mirrors tsconfig paths.
 */
export default defineConfig({
  test: {
    include: ["{lib,features,actions,components}/**/*.{test,spec}.{ts,tsx}"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
