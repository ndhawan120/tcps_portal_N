import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TC Professional Services Portal",
  description: "TC Professional Services Professional Development Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
