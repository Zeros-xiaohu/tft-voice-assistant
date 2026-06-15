import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "云顶语音助手",
  description: "语音查询云顶之弈数据",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "云顶助手" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh bg-white font-sans antialiased max-w-lg mx-auto relative">
        {children}
      </body>
    </html>
  )
}
