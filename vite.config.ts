
// @lovable.dev/vite-tanstack-config já inclui os plugins
// necessários para TanStack Start, React, Tailwind e Nitro.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true,
    },
    server: {
      entry: "server",
    },
  },
});