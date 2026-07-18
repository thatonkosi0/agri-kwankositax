import { SideNav } from "@/components/settings/side-nav"
import { Separator } from "@/components/ui/separator"
import { getCurrentUser } from "@/lib/auth"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Settings",
  description: "Customize your settings here",
}

// adminOnly items are hidden from non-admin (member) accounts.
const settingsCategories = [
  { title: "General", href: "/settings" },
  { title: "Profile & Plan", href: "/settings/profile" },
  { title: "Business Details", href: "/settings/business", adminOnly: true },
  { title: "LLM settings", href: "/settings/llm", adminOnly: true },
  { title: "Fields", href: "/settings/fields", adminOnly: true },
  { title: "Categories", href: "/settings/categories", adminOnly: true },
  { title: "Projects", href: "/settings/projects" },
  { title: "Currencies", href: "/settings/currencies" },
  { title: "Backups", href: "/settings/backups", adminOnly: true },
  { title: "Danger Zone", href: "/settings/danger", adminOnly: true },
  { title: "Users", href: "/settings/users", adminOnly: true },
]

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const navItems = user.isAdmin ? settingsCategories : settingsCategories.filter((c) => !c.adminOnly)

  return (
    <>
      <div className="space-y-6 p-10 pb-16">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Customize your settings here</p>
        </div>
        <Separator className="my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SideNav items={navItems} />
          </aside>
          <div className="flex w-full">{children}</div>
        </div>
      </div>
    </>
  )
}
