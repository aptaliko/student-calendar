import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans-app",
  subsets: ["greek", "latin"],
});

export const metadata: Metadata = {
  title: { default: "Ημερολόγιο Μαθητών", template: "%s · Ημερολόγιο Μαθητών" },
  description: "Προγραμματίστε μαθήματα, καταγράψτε παρουσίες και δείτε τα έσοδά σας — για ιδιαίτερους καθηγητές.",
  // Home Screen app on iPhone: full screen, own icon and name.
  appleWebApp: { capable: true, title: "Μαθήματα", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch / home bar; components pad themselves with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#100e17" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="el" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
