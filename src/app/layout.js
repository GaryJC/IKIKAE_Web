import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "./providers";
import SiteShell from "./components/SiteShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Ikikae",
  description: "Dream. Change. Achieve.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const hasSeenIntro = cookieStore.get("ikikae_intro_seen")?.value === "1";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <SiteShell hasSeenIntro={hasSeenIntro}>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
