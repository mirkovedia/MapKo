import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MapKo — Bulk Business Scanner for Digital Agencies",
  description:
    "Scan any zone on Google Maps, detect businesses without digital presence, and generate qualified leads for your agency. Export-ready outreach in minutes.",
  keywords: ["business scanner", "lead generation", "digital agency", "Google Maps", "local SEO"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
