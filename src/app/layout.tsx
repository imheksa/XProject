import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X Bulk Unfollow",
  description: "Bulk unfollow and remove followers on X, safely and within rate limits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans">{children}</body>
    </html>
  );
}
