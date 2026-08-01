import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Government School Digital Management System',
  description: 'A simple, secure school management platform for staff and students.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
