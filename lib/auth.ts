import config from "@/lib/config"
import { createUserDefaults } from "@/models/defaults"
import { getSelfHostedUser, getUserByEmail, getUserById, SELF_HOSTED_USER } from "@/models/users"
import { User } from "@/prisma/client"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { emailOTP } from "better-auth/plugins/email-otp"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "./db"
import { resend, sendOTPCodeEmail } from "./email"

// Where unapproved users are sent until an admin approves their account.
export const PENDING_APPROVAL_URL = "/pending"

export type UserProfile = {
  id: string
  name: string
  email: string
  avatar?: string
  membershipPlan: string
  storageUsed: number
  storageLimit: number
  aiBalance: number
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  appName: config.app.title,
  baseURL: config.app.baseURL,
  secret: config.auth.secret,
  email: {
    provider: "resend",
    from: config.email.from,
    resend,
  },
  session: {
    strategy: "jwt",
    expiresIn: 180 * 24 * 60 * 60, // 365 days
    updateAge: 24 * 60 * 60, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 365 * 24 * 60 * 60, // 365 days
    },
  },
  advanced: {
    cookiePrefix: "taxhacker",
    database: {
      generateId: "uuid",
    },
  },
  // Approval flags live on the user row. `input: false` means clients can never
  // set them during signup — only the server-side hooks below assign them.
  user: {
    additionalFields: {
      isApproved: { type: "boolean", defaultValue: false, input: false },
      isAdmin: { type: "boolean", defaultValue: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Don't auto-create a session on signup: pending users must wait for an
    // admin, and approval is enforced at sign-in (session hook below).
    autoSignIn: false,
    // Access is gated by admin approval, not email verification.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        // The very first account to register becomes the admin and is
        // auto-approved; everyone after signs up as pending.
        before: async (user) => {
          const existingUsers = await prisma.user.count()
          const isFirstUser = existingUsers === 0
          return { data: { ...user, isAdmin: isFirstUser, isApproved: isFirstUser } }
        },
        // Seed the new account with default categories, currencies, fields, etc.
        after: async (user) => {
          await createUserDefaults(user.id)
        },
      },
    },
    session: {
      create: {
        // Block sign-in for accounts an admin hasn't approved yet.
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId } })
          if (user && !user.isApproved) {
            throw new APIError("FORBIDDEN", {
              message: "Your account is awaiting admin approval.",
            })
          }
          return { data: session }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      disableSignUp: config.auth.disableSignup,
      otpLength: 6,
      expiresIn: 10 * 60, // 10 minutes
      sendVerificationOTP: async ({ email, otp }) => {
        const user = await getUserByEmail(email)
        if (!user) {
          throw new APIError("NOT_FOUND", { message: "User with this email does not exist" })
        }
        await sendOTPCodeEmail({ email, otp })
      },
    }),
    nextCookies(), // make sure this is the last plugin in the array
  ],
})

export async function getSession() {
  if (config.selfHosted.isEnabled) {
    const user = await getSelfHostedUser()
    return user ? { user } : null
  }

  return await auth.api.getSession({
    headers: await headers(),
  })
}

export async function getCurrentUser(): Promise<User> {
  if (config.selfHosted.isEnabled) {
    const user = await getSelfHostedUser()
    if (user) {
      return user
    } else {
      redirect(config.selfHosted.redirectUrl)
    }
  }

  // Try to return user from session
  const session = await getSession()
  if (session && session.user) {
    const user = await getUserById(session.user.id)
    if (user) {
      // Defense in depth: if approval was revoked after the session was issued,
      // send the user to the pending screen instead of into the app.
      if (!user.isApproved) {
        redirect(PENDING_APPROVAL_URL)
      }
      return user
    }
  }

  // No session or user found
  redirect(config.auth.loginUrl)
}

export function isSubscriptionExpired(user: User) {
  if (config.selfHosted.isEnabled) {
    return false
  }
  return user.membershipExpiresAt && user.membershipExpiresAt < new Date()
}

export function isAiBalanceExhausted(user: User) {
  if (config.selfHosted.isEnabled || user.membershipPlan === SELF_HOSTED_USER.membershipPlan) {
    return false
  }
  return user.aiBalance <= 0
}
