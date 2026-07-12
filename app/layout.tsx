import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: "./fonts/fraunces.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"]
});

const body = localFont({
  src: "./fonts/geist.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--font-body",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"]
});

const mono = localFont({
  src: "./fonts/geist-mono.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--font-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"]
});

export const metadata: Metadata = {
  title: "AnsemAI — The Black Bull desk",
  description: "Official-source assistant for $ANSEM / The Black Bull"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
