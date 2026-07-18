import config from "@/lib/config"
import { prisma } from "@/lib/db"
import { PROVIDERS } from "@/lib/llm-providers"
import { cache } from "react"
import { LLMProvider } from "@/ai/providers/llmProvider"

export type SettingsMap = Record<string, string>

/**
 * Helper to extract LLM provider settings from SettingsMap.
 */
export function getLLMSettings(settings: SettingsMap) {
  // Free Gemini first, then paid providers as automatic fallbacks.
  const priorities = (settings.llm_providers || "google,openai,mistral,openai_compatible").split(",").map(p => p.trim()).filter(Boolean)

  const providers = priorities.map((provider) => {
    // Per-user key wins; otherwise fall back to a shared key from env
    // (e.g. one GOOGLE_API_KEY set in Vercel that every member uses).
    if (provider === "openai") {
      return {
        provider: provider as LLMProvider,
        apiKey: settings.openai_api_key || config.ai.openaiApiKey || "",
        model: settings.openai_model_name || config.ai.openaiModelName || PROVIDERS[0]['defaultModelName'],
      }
    }
    if (provider === "google") {
      return {
        provider: provider as LLMProvider,
        apiKey: settings.google_api_key || config.ai.googleApiKey || "",
        model: settings.google_model_name || config.ai.googleModelName || PROVIDERS[1]['defaultModelName'],
      }
    }
    if (provider === "mistral") {
      return {
        provider: provider as LLMProvider,
        apiKey: settings.mistral_api_key || config.ai.mistralApiKey || "",
        model: settings.mistral_model_name || config.ai.mistralModelName || PROVIDERS[2]['defaultModelName'],
      }
    }
    if (provider === "openai_compatible") {
      const providerMeta = PROVIDERS.find(p => p.key === "openai_compatible")
      return {
        provider: provider as LLMProvider,
        apiKey: settings.openai_compatible_api_key || "",
        model: settings.openai_compatible_model_name || "",
        baseUrl: settings.openai_compatible_base_url || providerMeta?.defaultBaseUrl || "",
      }
    }
    return null
  }).filter((provider): provider is NonNullable<typeof provider> => provider !== null)

  return {
    providers,
  }
}

export const getSettings = cache(async (userId: string): Promise<SettingsMap> => {
  const settings = await prisma.setting.findMany({
    where: { userId },
  })

  return settings.reduce((acc, setting) => {
    acc[setting.code] = setting.value || ""
    return acc
  }, {} as SettingsMap)
})

export const updateSettings = cache(async (userId: string, code: string, value: string | undefined) => {
  return await prisma.setting.upsert({
    where: { userId_code: { code, userId } },
    update: { value },
    create: {
      code,
      value,
      name: code,
      userId,
    },
  })
})
