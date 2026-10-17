"use client"

import { FormError } from "@/components/forms/error"
import { FormInput } from "@/components/forms/simple"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useState } from "react"

// "forgot" asks for the email and sends a code; "reset" takes that code plus a new password.
type AuthMode = "signin" | "signup" | "forgot" | "reset"

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
]

const SUBMIT_LABELS: Record<AuthMode, string> = {
  signin: "Sign in",
  signup: "Create account",
  forgot: "Send code",
  reset: "Reset password",
}

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
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const router = useRouter()

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword("")
    setOtp("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setIsLoading(true)

    try {
      if (mode === "forgot") {
        const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" })
        if (result.error) {
          setError(result.error.message || "Failed to send code")
          return
        }
        setMode("reset")
        setNotice(`We emailed a 6-digit code to ${email}. It expires in 10 minutes.`)
        return
      }

      if (mode === "reset") {
        const failedRules = passwordErrors(password)
        if (failedRules.length > 0) {
          setError(`Password must include: ${failedRules.join(", ")}`)
          return
        }

        const result = await authClient.emailOtp.resetPassword({ email, otp: otp.trim(), password })
        if (result.error) {
          setError(result.error.message || "Failed to reset password")
          return
        }

        switchMode("signin")
        setNotice("Password updated. Sign in with your new password.")
        return
      }

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

      {mode === "reset" && (
        <FormInput
          title="Code from email"
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          autoComplete="one-time-code"
          maxLength={6}
        />
      )}

      {mode !== "forgot" && (
        <div>
          <FormInput
            title={mode === "reset" ? "New password" : "Password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {(mode === "signup" || mode === "reset") && password.length > 0 && (
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
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Please wait..." : SUBMIT_LABELS[mode]}
      </Button>

      {mode === "signin" && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => switchMode("forgot")}
        >
          Forgot password?
        </button>
      )}

      {mode === "reset" && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => switchMode("forgot")}
        >
          Didn&apos;t get a code? Send another
        </button>
      )}

      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground"
        onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Back to sign in"}
      </button>

      {notice && <p className="text-xs text-center text-green-700">{notice}</p>}
      {error && <FormError className="text-center">{error}</FormError>}
    </form>
  )
}
