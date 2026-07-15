import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    serverActions: {
      // Leave room for multipart headers while enforcing the 10 MB file limit in code and Storage.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
