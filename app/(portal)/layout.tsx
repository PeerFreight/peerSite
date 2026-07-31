import localFont from "next/font/local";
import "./portal.css";

const manrope = localFont({
  src: "../../public/styles/fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export default function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // manrope.className sets font-family directly on this subtree. The
  // `font-sans` utility can't do it: @theme's --font-sans resolves
  // var(--font-manrope) at :root, where the next/font variable (scoped to
  // this div) doesn't exist, so the stack collapsed to the system font.
  return (
    <div
      className={`${manrope.className} ${manrope.variable} min-h-screen bg-white text-ink antialiased`}
    >
      {children}
    </div>
  );
}
