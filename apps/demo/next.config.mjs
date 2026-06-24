/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the workspace SDK (TypeScript source) and circomlibjs through Next.
  transpilePackages: ["@prism-stellar/sdk"],
  webpack: (config) => {
    // The SDK uses explicit `.ts` import specifiers (Node type-stripping friendly);
    // let webpack resolve them.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".ts": [".ts"],
    };
    return config;
  },
};
export default nextConfig;
