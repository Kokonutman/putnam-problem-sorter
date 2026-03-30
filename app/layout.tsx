import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Putnam Proof Trainer",
  description: "A personal Putnam proof training system calibrated by historical Top N score distributions.",
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
