import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // TODO: make me linting again
  },
  images: {
    unoptimized: true, // FIXME: bug on prod, images always empty, investigate later
  },
  // Native / heavy packages must not be bundled — they load their own binaries
  // (sharp, @napi-rs/canvas) or worker assets (pdfjs) at runtime on serverless.
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "pdfjs-dist"],
  // The invoice PDF renderer (@react-pdf/renderer) loads Inter fonts from
  // ./public/fonts at runtime by relative path. Those files aren't traced into
  // the serverless function by default, so bundle them explicitly or PDF
  // generation fails on Vercel ("Failed to generate PDF").
  outputFileTracingIncludes: {
    "/**": ["./public/fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "256mb",
    },
  },
}

const isSentryEnabled = process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT

export default isSentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: !process.env.CI,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      disableLogger: true,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
    })
  : nextConfig
