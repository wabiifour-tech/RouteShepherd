import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import SessionProvider from "@/components/auth/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RouteShepherd - Intelligent Transit Coordination",
  description: "AI-powered intelligent transit coordination platform for Redemption City, Nigeria. Coordinating 300+ buses across 17 pickup points for RCCG events.",
  keywords: ["RouteShepherd", "Redemption City", "RCCG", "transit", "bus coordination", "Nigeria", "Lagos"],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "RouteShepherd - Intelligent Transit Coordination",
    description: "AI-powered transit coordination for Redemption City events. 300+ buses, 17 pickup points, 5M+ attendees.",
    url: "https://routeshepherd.vercel.app",
    siteName: "RouteShepherd",
    images: [
      {
        url: "/logo-premium.png",
        width: 1200,
        height: 630,
        alt: "RouteShepherd - Intelligent Transit Coordination",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RouteShepherd - Intelligent Transit Coordination",
    description: "AI-powered transit coordination for Redemption City events.",
    images: ["/logo-premium.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
