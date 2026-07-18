import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { ColoredText } from "@/components/ui/colored-text"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function PendingApprovalPage() {
  return (
    <Card className="w-full max-w-xl mx-auto p-8 flex flex-col items-center justify-center gap-4 text-center">
      <Image src="/logo/512.png" alt="Logo" width={144} height={144} className="w-36 h-36" />
      <CardTitle className="text-3xl font-bold">
        <ColoredText>Awaiting approval</ColoredText>
      </CardTitle>
      <CardContent className="w-full flex flex-col items-center gap-4">
        <p className="text-muted-foreground">
          Your account has been created but needs to be approved by an administrator before you can sign in. You will be
          able to log in once your account is approved.
        </p>
        <Button asChild variant="outline">
          <Link href="/enter">Back to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export const dynamic = "force-dynamic"
