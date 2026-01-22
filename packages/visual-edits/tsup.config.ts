import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/types/index.ts",
    "src/babel/index.ts",
    "src/sandbox/index.ts",
    "src/web/index.ts",
    "src/api/index.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ["react", "react-native", "next", "pusher", "pusher-js"],
});
