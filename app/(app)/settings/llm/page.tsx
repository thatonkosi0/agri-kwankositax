import LLMSettingsForm from "@/components/settings/llm-settings-form"
import { getCurrentUser } from "@/lib/auth"
import config from "@/lib/config"
import { DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT } from "@/models/defaults"
import { getFields } from "@/models/fields"
import { getSettings } from "@/models/settings"

export default async function LlmSettingsPage() {
  const user = await getCurrentUser()
  const settings = await getSettings(user.id)
  const fields = await getFields(user.id)

  // Existing users predate this setting; show the default so the textarea isn't
  // blank (the analysis itself already falls back to the same default).
  if (!settings.prompt_analyse_bank_statement) {
    settings.prompt_analyse_bank_statement = DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT
  }

  return (
    <>
      <div className="w-full max-w-2xl">
        <LLMSettingsForm settings={settings} fields={fields} isSelfHosted={config.selfHosted.isEnabled} />
      </div>
    </>
  )
}
