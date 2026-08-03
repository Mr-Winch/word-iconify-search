import { defineConfig } from "vite";
import * as devCerts from "office-addin-dev-certs";

export default defineConfig(async ({ command }) => {
  const https = command === "serve"
    ? await devCerts.getHttpsServerOptions()
    : undefined;

  return {
    base: command === "build" ? "/word-iconify-search/" : "/",
    server: {
      host: "localhost",
      port: 3000,
      strictPort: true,
      https,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});