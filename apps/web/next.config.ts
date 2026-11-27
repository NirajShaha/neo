import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"
const appDirectory = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(appDirectory, "../.."),
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
