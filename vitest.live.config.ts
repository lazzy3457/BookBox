import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

// Vérifications sur les vraies API (Google Books, Open Library). Hors de la
// suite normale : à lancer à la main avec `npm run test:live`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/live/**/*.live.ts"],
    testTimeout: 120_000,
    fileParallelism: false
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
