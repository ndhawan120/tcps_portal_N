import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tcps-portal-n.vercel.app"),
  title: { default: "TC Professional Services Portal", template: "%s | TC Professional Services" },
  description: "TC Professional Services professional development portal for ACCA exams, PER objectives, employee progress and important updates.",
  applicationName: "TC Professional Services Portal",
  keywords: ["TC Professional Services", "ACCA", "PER", "ACCA exams", "professional development"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "TC Professional Services", title: "TC Professional Services Portal", description: "Professional development portal for ACCA exams, PER objectives and important updates.", url: "https://tcps-portal-n.vercel.app/" },
  twitter: { card: "summary", title: "TC Professional Services Portal", description: "Professional development portal for ACCA exams, PER objectives and important updates." },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
