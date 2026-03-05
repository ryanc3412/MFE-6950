import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import federation from "@originjs/vite-plugin-federation";

// When loaded as a remote, chunks are requested from the shell's origin unless we use an absolute base.
// This makes the remoteEntry emit full URLs so chunks load from the Vue server (3004).
const REMOTE_URL = "http://localhost:3004";
export default defineConfig({
  base: REMOTE_URL + "/",
  plugins: [
    vue(),
    federation({
      name: "remote_vue",
      filename: "remoteEntry.js",
      exposes: {
        "./VueApp": "./src/mount.ts",
      },
      shared: ["vue"],
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
  preview: {
    cors: true,
  },
});
