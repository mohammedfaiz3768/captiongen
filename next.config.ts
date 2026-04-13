import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Allow up to 20MB request bodies for audio uploads to the transcribe route
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
