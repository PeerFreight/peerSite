import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0e1d3a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.peer-freight.com"),
  icons: {
    icon: [{ url: "/site/favicon.png", type: "image/png" }],
    apple: [{ url: "/site/favicon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
