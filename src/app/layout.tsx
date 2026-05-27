import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import SessionProvider from "@/components/auth/SessionProvider";

// Sora — Modern, premium heading font for transportation/enterprise feel
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

// Inter — Industry-standard body text, excellent readability
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1B5E20" },
    { media: "(prefers-color-scheme: dark)", color: "#0D3B0F" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://routeshepherd.vercel.app"),
  title: "RouteShepherd - Intelligent Transit Coordination",
  description:
    "Intelligent transit coordination platform for Redemption City, Nigeria. Real-time bus tracking, fleet management, and trip pre-registration.",
  keywords: [
    "RouteShepherd",
    "Redemption City",
    "RCCG",
    "transit",
    "bus coordination",
    "Nigeria",
    "Lagos",
    "transportation",
  ],
  applicationName: "RouteShepherd",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RouteShepherd",
    startupImage: [
      { url: "/apple-touch-icon.png" },
    ],
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "RouteShepherd - Intelligent Transit Coordination",
    description:
      "AI-powered transit coordination for Redemption City events. 300+ buses, 17 pickup points, 5M+ attendees.",
    url: "https://routeshepherd.vercel.app",
    siteName: "RouteShepherd",
    images: [
      {
        url: "/logo-3d-premium.png",
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
    description:
      "AI-powered transit coordination for Redemption City events.",
    images: ["/logo-3d-premium.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA: Register service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('[PWA] Service Worker registered with scope:', registration.scope);
                  }).catch(function(error) {
                    console.log('[PWA] Service Worker registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${sora.variable} ${inter.variable} antialiased bg-background text-foreground`}
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
