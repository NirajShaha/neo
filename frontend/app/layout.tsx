import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"

import "./globals.css"
import { cn } from "@/lib/utils"
import { NeoStoreProvider } from "@/lib/neo-store"
import { NeoSessionProvider } from "@/components/neo/session-provider"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <TooltipProvider>
          <NeoSessionProvider>
            <NeoStoreProvider>{children}</NeoStoreProvider>
          </NeoSessionProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
