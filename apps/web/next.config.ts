import type { NextConfig } from "next"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    return [
      {
        source: "/storage/:path*",
        destination: `${backendUrl}/storage/:path*`,
      },
    ]
  },
}

export default nextConfig
