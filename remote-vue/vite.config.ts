import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import federation from "@originjs/vite-plugin-federation";

const REMOTE_URL = "http://localhost:3004";
export default defineConfig({
  base: REMOTE_URL + "/",
  plugins: [
    vue(),
    // module federation plugin to create the remoteEntry.js file
    federation({
      name: "remote_vue",
      filename: "remoteEntry.js",
      // we are exposing the mount.ts file, not the App.vue file
      exposes: {
        "./VueApp": "./src/mount.ts",
      },
      shared: ["vue"],
    }),
  ],
  // builds the remoteEntry.js file
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 3004,
    cors: true,
  },
});
