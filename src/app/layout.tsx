import type { Metadata } from "next";
import { ToastRoot } from "./components/ToastRoot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feature flags admin",
  description: "Manage AppConfig hosted feature flags",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ToastRoot />
      </body>
    </html>
  );
}
