import type { Metadata } from "next";
import { inter, plusJakarta, roboto, robotoCondensed } from "@/lib/fonts";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { SessionWrapper } from "@/components/SessionWrapper";
import { NotificationProvider } from "@/components/NotificationProvider";
import { ConditionalHeader } from "@/components/ConditionalHeader";

export const metadata: Metadata = {
  title: "Whisper Notes - AI Transcription & Speaker Diarization",
  description:
    "Advanced AI-powered audio and video transcription with speaker identification and automatic action item extraction.",
  keywords: [
    "transcription",
    "AI",
    "speaker diarization",
    "audio",
    "video",
    "meeting notes",
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} ${roboto.variable} ${robotoCondensed.variable}`}
    >
      <head>
        {/* Primary favicon - SVG for modern browsers */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Fallback PNG favicon for older browsers */}
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" href="/favicon.png" sizes="180x180" />
        {/* Theme color */}
        <meta name="theme-color" content="#8850F2" />
        {/* Microsoft tile */}
        <meta name="msapplication-TileColor" content="#8850F2" />
        <meta name="msapplication-TileImage" content="/favicon.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        {/* Force favicon refresh */}
        <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.png?v=2" type="image/png" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <SessionWrapper>
            <NotificationProvider>
              <ConditionalHeader />
              <main className="relative flex min-h-screen flex-col">
                {children}
              </main>
            </NotificationProvider>
          </SessionWrapper>
        </QueryProvider>
      </body>
    </html>
  );
}
