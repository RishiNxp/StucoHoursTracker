import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STUCO Hours Desk",
  description: "A fair, private way to manage STUCO volunteer opportunities.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
