import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'build',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true
  },
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
