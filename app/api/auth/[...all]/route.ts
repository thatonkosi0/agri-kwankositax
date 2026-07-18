import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

// Signup seeds default data for the new account, so allow extra time.
export const maxDuration = 60

export const { POST, GET } = toNextJsHandler(auth)
