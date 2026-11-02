import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import "./globals.css"

const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
})

export const metadata: Metadata = {
  title: "LeadGen Free — парсер организаций по городу и рубрике",
  description:
    "Бесплатный сбор контактов компаний: телефоны, сайты, email и соцсети по городу и сфере бизнеса. Выгрузка в Excel.",
}

export const viewport: Viewport = {
  themeColor: "#12161d",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`bg-background ${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
