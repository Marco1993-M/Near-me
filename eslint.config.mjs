import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "service-worker.js",
      "src/**/*.js",
      "vite.config.js",
      "generate-sitemap.js",
    ],
  },
];

export default config;
