
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster as HotToaster } from "react-hot-toast"
import { APP_NAME, ORG_NAME } from "@/lib/org"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: `${APP_NAME} - ${ORG_NAME}`,
  description: `Sistema seguro para votação eletrônica em sessões da ${ORG_NAME}`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
          <HotToaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                fontWeight: 500,
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
