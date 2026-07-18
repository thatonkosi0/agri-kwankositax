import { manifest as invoicesManifest } from "./invoices/manifest"

export type AppManifest = {
  name: string
  description: string
  icon: string
}

// Static app registry. Registered explicitly (rather than read from the
// filesystem at runtime) so it works on serverless hosts like Vercel where the
// source tree isn't available and dynamic globbed imports aren't bundled.
const APPS: { id: string; manifest: AppManifest }[] = [{ id: "invoices", manifest: invoicesManifest }]

export async function getApps(): Promise<{ id: string; manifest: AppManifest }[]> {
  return APPS
}
