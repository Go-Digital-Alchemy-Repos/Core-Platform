import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isReplit = process.env.REPL_ID !== undefined;

function preambleFixPlugin(): Plugin {
  return {
    name: "preamble-fix",
    enforce: "post",
    apply: "serve",
    transform(code, id) {
      if (id.includes("node_modules") || !code.includes("can't detect preamble")) return;
      return code.replace(
        /if\s*\(!window\.\$RefreshReg\$\)\s*\{[^}]*can't detect preamble[^}]*\}/s,
        `if (!window.$RefreshReg$) { window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (t) => t; }`
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    preambleFixPlugin(),
    ...(isReplit && process.env.NODE_ENV !== "production"
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default(),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/wouter/") ||
            // Keep the React overlay stack in the framework chunk.
            // Splitting it separately created a runtime cycle where
            // framework -> overlays -> framework left React undefined
            // in downstream chunks like maps on production boot.
            id.includes("/@floating-ui/") ||
            id.includes("/react-remove-scroll/") ||
            id.includes("/react-remove-scroll-bar/") ||
            id.includes("/react-style-singleton/") ||
            id.includes("/aria-hidden/") ||
            id.includes("/use-callback-ref/") ||
            id.includes("/use-sidecar/")
          ) {
            return "framework";
          }

          if (id.includes("/@tanstack/react-query/")) {
            return "query";
          }

          if (id.includes("/@tiptap/")) {
            return "tiptap";
          }

          if (
            id.includes("/prosemirror-") ||
            id.includes("/orderedmap/") ||
            id.includes("/rope-sequence/")
          ) {
            return "prosemirror";
          }

          if (
            id.includes("/@radix-ui/") ||
            id.includes("/cmdk/") ||
            id.includes("/vaul/") ||
            id.includes("/input-otp/") ||
            id.includes("/react-resizable-panels/")
          ) {
            return "ui";
          }

          if (
            id.includes("/lucide-react/") ||
            id.includes("/react-icons/")
          ) {
            return "icons";
          }

          if (
            id.includes("/date-fns/") ||
            id.includes("/sanitize-html/") ||
            id.includes("/browser-image-compression/")
          ) {
            return "utils";
          }

          if (
            id.includes("/class-variance-authority/") ||
            id.includes("/clsx/") ||
            id.includes("/tailwind-merge/")
          ) {
            return "styling";
          }

          if (id.includes("/react-image-crop/")) {
            return "media";
          }

          if (id.includes("/recharts/")) {
            return "charts";
          }

          if (id.includes("/embla-carousel")) {
            return "carousel";
          }

          if (id.includes("/react-day-picker/")) {
            return "calendar";
          }

          if (id.includes("/framer-motion/")) {
            return "motion";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
