import { InvoiceReminderEmail } from "@/components/emails/invoice-reminder-email"
import { NewsletterWelcomeEmail } from "@/components/emails/newsletter-welcome-email"
import { OTPEmail } from "@/components/emails/otp-email"
import React from "react"
import { Resend } from "resend"
import config from "./config"

export const resend = new Resend(config.email.apiKey)

export async function sendOTPCodeEmail({ email, otp }: { email: string; otp: string }) {
  const html = React.createElement(OTPEmail, { otp })

  return await resend.emails.send({
    from: config.email.from,
    to: email,
    subject: "Your Agri-KwankosiTax verification code",
    react: html,
  })
}

export async function sendInvoiceReminderEmail({
  to,
  invoiceName,
  amount,
  dueDate,
  daysOverdue,
  businessName,
}: {
  to: string
  invoiceName: string
  amount: string
  dueDate: string | null
  daysOverdue: number
  businessName: string
}) {
  const html = React.createElement(InvoiceReminderEmail, {
    invoiceName,
    amount,
    dueDate,
    daysOverdue,
    businessName,
  })

  return await resend.emails.send({
    from: config.email.from,
    to,
    subject: `Payment reminder: ${invoiceName}`,
    react: html,
  })
}

export async function sendNewsletterWelcomeEmail(email: string) {
  const html = React.createElement(NewsletterWelcomeEmail)

  return await resend.emails.send({
    from: config.email.from,
    to: email,
    subject: "Welcome to Agri-KwankosiTax Newsletter!",
    react: html,
  })
}
