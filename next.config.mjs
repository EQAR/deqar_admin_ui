import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  env: {
    REACT_APP_WEBSITE_AGENCY: process.env.REACT_APP_WEBSITE_AGENCY,
    REACT_APP_WEBSITE_COUNTRY: process.env.REACT_APP_WEBSITE_COUNTRY,
    REACT_APP_WEBSITE_INSTITUTION: process.env.REACT_APP_WEBSITE_INSTITUTION,
    REACT_APP_WEBSITE_REPORT: process.env.REACT_APP_WEBSITE_REPORT,
    REACT_APP_ESCO_API: process.env.REACT_APP_ESCO_API,
  },
});

export default nextConfig;
