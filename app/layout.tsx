import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CaptionGen — AI Video Caption Generator",
  description:
    "Generate accurate captions for your videos using Groq Whisper AI. Supports Hindi, Hinglish, and 12 languages. 10 caption templates. Export to SRT, VTT, ASS, TXT, JSON.",
  keywords: [
    "caption generator",
    "subtitle generator",
    "AI captions",
    "Hinglish captions",
    "Groq Whisper",
    "SRT",
    "VTT",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Orbitron:wght@700&family=Poppins:wght@700;800&family=Oswald:wght@700;900&family=Permanent+Marker&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased bg-[#09090b] text-zinc-50">
        <TooltipProvider delay={400}>
          {children}
        </TooltipProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1C1C22",
              border: "1px solid #2E2E38",
              color: "#FAFAFA",
            },
          }}
        />
      </body>
    </html>
  );
}
