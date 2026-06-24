/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the workspace SDK (TypeScript source) through Next.
  transpilePackages: ["@prism-stellar/sdk"],
  // Heavy node-only crypto libs: require at runtime instead of bundling (server routes only).
  serverExternalPackages: ["@stellar/stellar-sdk", "circomlibjs", "snarkjs", "sodium-native"],
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
