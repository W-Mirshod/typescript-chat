import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Simplified ChatGPT-like interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50`}>
        <Sidebar />
        <main className="flex-1 bg-white relative flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
