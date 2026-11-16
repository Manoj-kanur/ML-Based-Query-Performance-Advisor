import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ML-Based Query Performance Advisor",
  description: "PostgreSQL Query Performance Tuning & Missing Index Advisor powered by Machine Learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#121316] text-[#F4F6F8] font-mono antialiased selection:bg-[#CCFF00] selection:text-[#121316]">
        {children}
      </body>
    </html>
  );
}
