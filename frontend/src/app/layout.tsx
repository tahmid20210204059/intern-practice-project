import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import SessionExpiryHandler from "@/providers/SessionExpiryHandler";

export const metadata: Metadata = {
  title: "Dev Community",
  description: "A community platform for developers to connect, share, and grow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <QueryProvider>
          <SessionExpiryHandler />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}