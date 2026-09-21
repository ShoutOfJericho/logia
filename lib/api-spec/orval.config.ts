import { defineConfig } from "orval";

export default defineConfig({
  apiZod: {
    input: "./openapi.yaml",
    output: {
      mode: "single",
      target: "../api-zod/src/index.ts",
      client: "zod",
      prettier: true,
      override: {
        zod: {
          generate: {
            param: true,
            body: true,
            response: true,
            query: true,
          },
        },
      },
    },
  },

  apiClientReact: {
    input: "./openapi.yaml",
    output: {
      mode: "single",
      target: "../api-client-react/src/index.ts",
      client: "react-query",
      prettier: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: "../api-client-react/src/fetcher.ts",
          name: "customFetcher",
        },
      },
    },
  },
});
