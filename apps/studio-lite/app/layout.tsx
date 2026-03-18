import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata = {
  title: 'Supalite Studio',
  description: 'Lightweight database dashboard for Supalite',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
