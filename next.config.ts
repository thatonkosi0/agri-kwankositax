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
  // Force-include files that aren't reachable by static import analysis, so
  // Next's file tracing still ships them into the serverless function:
  // - Inter fonts: @react-pdf/renderer loads them from ./public/fonts by
  //   relative path at runtime (invoice PDF generation).
  // - pdf.js worker: pdf.js loads pdf.worker.mjs via a dynamic "fake worker"
  //   import, so tracing prunes it and PDF analysis fails on Vercel with
  //   "Cannot find module .../pdf.worker.mjs".
  outputFileTracingIncludes: {
    "/**": [
      "./public/fonts/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      // Standard PDF font data — required to render text drawn with non-embedded
      // base-14 fonts (otherwise statement table rows render blank on Vercel).
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
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
