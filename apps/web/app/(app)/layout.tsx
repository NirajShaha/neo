import { NeoSessionProvider } from "@/components/neo/session-provider"
import { NeoStoreProvider } from "@/lib/neo-store"
import { requireSession } from "@/lib/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()
  return (
    <NeoSessionProvider session={session}>
      <NeoStoreProvider>{children}</NeoStoreProvider>
    </NeoSessionProvider>
  )
}
