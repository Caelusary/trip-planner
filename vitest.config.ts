import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // lib/weather.ts imports "server-only", which throws outside a React
      // Server Components bundle. Stub it out for unit tests.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
