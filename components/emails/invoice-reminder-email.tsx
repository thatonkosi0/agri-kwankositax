import React from "react"
import { EmailLayout } from "./email-layout"

interface InvoiceReminderEmailProps {
  invoiceName: string
  amount: string
  dueDate: string | null
  daysOverdue: number
  businessName: string
}

export const InvoiceReminderEmail: React.FC<InvoiceReminderEmailProps> = ({
  invoiceName,
  amount,
  dueDate,
  daysOverdue,
  businessName,
}) => (
  <EmailLayout preview={`Payment reminder for ${invoiceName}`}>
    <h2 style={{ color: "#4f46e5" }}>Payment reminder</h2>
    <p style={{ fontSize: "15px" }}>Hi,</p>
    <p style={{ fontSize: "15px" }}>
      This is a friendly reminder that <strong>{invoiceName}</strong> for <strong>{amount}</strong>
      {dueDate ? ` was due on ${dueDate}` : ""}
      {daysOverdue > 0 ? ` and is now ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : ""}.
    </p>
    <p style={{ fontSize: "15px" }}>
      If payment has already been made, please disregard this message. Otherwise we&apos;d appreciate settlement at your
      earliest convenience.
    </p>
    <p style={{ fontSize: "15px", marginTop: "24px" }}>
      Kind regards,
      <br />
      {businessName}
    </p>
  </EmailLayout>
)
