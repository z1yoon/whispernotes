import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

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
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            <main className="relative flex min-h-screen flex-col">
              {children}
            </main>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#1f2937",
                  color: "#f9fafb",
                  border: "1px solid #374151",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                },
                success: {
                  iconTheme: {
                    primary: "#10b981",
                    secondary: "#ffffff",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#ffffff",
                  },
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
