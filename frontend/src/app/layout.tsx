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
      <body className="bg-[#170515] text-[#DDE3E8] antialiased selection:bg-[#EAA000] selection:text-[#170515]">
        {children}
      </body>
    </html>
  );
}
