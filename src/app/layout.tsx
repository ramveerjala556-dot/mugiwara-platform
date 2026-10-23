import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MUGIWARA — One Crew. One Goal.",
    template: "%s · MUGIWARA",
  },
  description:
    "MUGIWARA is an AI software creation platform: describe what you want and a crew of specialised agents plans, designs, codes, tests and ships it.",
  applicationName: "MUGIWARA",
  keywords: ["AI", "software creation", "agents", "Next.js", "Supabase"],
  authors: [{ name: "MUGIWARA" }],
  openGraph: {
    title: "MUGIWARA — One Crew. One Goal.",
    description: "Turn ideas into reality with your AI crew.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050b1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
