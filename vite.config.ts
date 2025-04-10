import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    allowedHosts: ["n6q5yp-5173.csb.app", "khwfv7-5173.csb.app"],
  },
});
