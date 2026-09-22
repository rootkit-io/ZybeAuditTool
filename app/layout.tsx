import type { Metadata } from "next";
import { Playfair_Display, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Free Website Audit | Zybe Social",
  description: "Get a practical, ethical website audit from Zybe Social."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${playfair.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
