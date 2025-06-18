import type { Metadata } from "next";
import { inter, plusJakarta, roboto, robotoCondensed } from "@/lib/fonts";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            <NotificationProvider>
              <ConditionalHeader />
              <main className="relative flex min-h-screen flex-col">
                {children}
              </main>
            </NotificationProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
