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
  return (
    <div className={`${manrope.variable} font-sans min-h-screen bg-white text-ink antialiased`}>
      {children}
    </div>
  );
}
