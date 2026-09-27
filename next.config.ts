import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The app's own upload limit (MAX_FILE_SIZE_BYTES in lib/constants.ts) is 10MB.
      // Next's default Server Action body limit is 1MB, which would reject those
      // uploads before our own validation ever runs. Give some headroom over 10MB.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
