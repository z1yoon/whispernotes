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
    icon: '/favicon.ico?v=3',
    shortcut: '/favicon.png?v=3',
    apple: '/favicon.png?v=3',
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
        {/* Theme color - favicon is handled by metadata */}
        <meta name="theme-color" content="#8850F2" />
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
