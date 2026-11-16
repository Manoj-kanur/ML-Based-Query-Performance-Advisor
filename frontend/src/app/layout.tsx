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
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
