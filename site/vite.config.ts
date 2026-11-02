import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["tests/{unit,integration}/**/*.test.ts"],
    environment: "jsdom",
  },
});
