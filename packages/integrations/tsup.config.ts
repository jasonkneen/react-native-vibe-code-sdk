import { defineConfig } from "tsup";

const sharedConfig = {
  format: ["cjs", "esm"] as const,
  dts: true,
  sourcemap: true,
  splitting: false,
  external: [
    "react",
    "next",
    "@tiptap/core",
    "@tiptap/react",
    "@tiptap/pm",
    "@tiptap/starter-kit",
    "@tiptap/extension-mention",
    "@tiptap/extension-placeholder",
    "@tiptap/suggestion",
    "tippy.js",
    "ai",
    "@ai-sdk/anthropic",
  ],
};

export default defineConfig([
  // Client-side entry points (components and hooks)
  {
    ...sharedConfig,
    entry: {
      "components/index": "src/components/index.ts",
      "hooks/index": "src/hooks/index.ts",
    },
    clean: true,
    banner: {
      js: '"use client";',
    },
  },
  // Server-side entry points (toolkit, utils, config, templates, and main index)
  {
    ...sharedConfig,
    entry: {
      index: "src/index.ts",
      "config/index": "src/config/index.ts",
      "templates/index": "src/templates/index.ts",
      "toolkit/index": "src/toolkit/index.ts",
      "utils/index": "src/utils/index.ts",
    },
    clean: false,
  },
]);
