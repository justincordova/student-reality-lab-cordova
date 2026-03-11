import "./src/lib/env"; // Side-effect: validates env vars at build time
import path from "path";

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.logo.dev" }],
  },
  env: {
    NEXT_PUBLIC_LOGO_DEV_TOKEN: process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN,
  },
  turbopack: {
    resolveAlias: {
      // Ensure tailwindcss resolves from project root, not a parent dir
      tailwindcss: path.resolve("./node_modules/tailwindcss"),
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
