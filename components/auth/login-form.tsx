"use client"

import { FormError } from "@/components/forms/error"
import { FormInput } from "@/components/forms/simple"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useState } from "react"

type AuthMode = "signin" | "signup"

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
]

function passwordErrors(password: string) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label)
}

// Derive a display name from the email local part (the signup form only asks
// for email + password, matching the reference design).
function nameFromEmail(email: string) {
  const local = email.split("@")[0] || email
  return local.trim() || email
}

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState(defaultEmail || "")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setIsLoading(true)

    try {
      if (mode === "signup") {
        const failedRules = passwordErrors(password)
        if (failedRules.length > 0) {
          setError(`Password must include: ${failedRules.join(", ")}`)
          return
        }

        const result = await authClient.signUp.email({
          email,
          password,
          name: nameFromEmail(email),
        })
        if (result.error) {
          setError(result.error.message || "Failed to create account")
          return
        }

        // autoSignIn is disabled, so the account is created but not logged in.
        setNotice(
          "Account created. An admin needs to approve it before you can sign in. If you are the first user, you are the admin — just sign in."
        )
        setMode("signin")
        setPassword("")
        return
      }

      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        // Covers wrong credentials and the "awaiting admin approval" block.
        setError(result.error.message || "Invalid email or password")
        return
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      <FormInput
        title="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <div>
        <FormInput
          title="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {mode === "signup" && password.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(password)
              return (
                <li
                  key={rule.label}
                  className={`text-xs flex items-center gap-1.5 ${passed ? "text-green-700" : "text-muted-foreground"}`}
                >
                  <span>{passed ? "✓" : "○"}</span>
                  {rule.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
      </Button>

      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          setMode(mode === "signup" ? "signin" : "signup")
          setError(null)
          setNotice(null)
        }}
      >
        {mode === "signup" ? "Have an account? Sign in" : "Need an account? Sign up"}
      </button>

      {notice && <p className="text-xs text-center text-green-700">{notice}</p>}
      {error && <FormError className="text-center">{error}</FormError>}
    </form>
  )
}
