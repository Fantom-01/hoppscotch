// import { tuple } from "io-ts"
// import { resolve } from "path"
// import { defineConfig } from "vite"

// export default defineConfig({
//   build: {
//     outDir: "./dist",
//     emptyOutDir: true,
//     lib: {
//       entry: resolve(__dirname, "src/index.ts"),
//       fileName: "hoppscotch-data",
//       formats: ["es", "cjs"],
//     },
//   },
// })

import { defineConfig } from "vite"

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => `hoppscotch-data.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "@apidevtools/swagger-parser",
        "buffer",
        "process",
        "fp-ts",
        "lodash",
        "zod",
        "@faker-js/faker"
      ],
    },
  },
  worker: {
    format: "es",
    // plugins: [],
    rollupOptions: {
      external: [
        "@apidevtools/swagger-parser",
        "buffer",
        "process"
      ],
    },
  },
})