import "./src/lib/env"; // Side-effect: validates env vars at build time

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "logo.clearbit.com" }],
  },
  env: {
    HF_TOKEN: process.env.HF_TOKEN,
  },
};

export default nextConfig;
