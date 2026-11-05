import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GH_PAGES === "1" ? "/myoko-project-group2/" : "/",
  plugins: [react()],
});
