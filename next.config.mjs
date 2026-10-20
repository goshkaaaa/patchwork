const basePath = process.env.GITHUB_ACTIONS ? "/patchwork" : "";
const nextConfig = {
  output: "export",
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};
export default nextConfig;
