import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Watchtower — Retail Operations",
  description: "Multi-location marketplace operations monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F8F9FA]">
        <div className="flex">
          <Sidebar />
          <main className="md:ml-56 flex-1 min-h-screen pt-16 md:pt-10 px-4 pb-8 md:px-8 md:pb-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
