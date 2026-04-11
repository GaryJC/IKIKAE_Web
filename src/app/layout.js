import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "./providers";
import Navigation from "./navigation";
import { AuthProvider } from "../lib/AuthContext";
import OpeningAnimation from "./components/OpeningAnimation";

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
        <div className="min-h-screen w-full overflow-x-hidden">
          <Providers>
            <AuthProvider>
              <OpeningAnimation enabled={!hasSeenIntro} />
              <Navigation />
              <main className="w-full">{children}</main>
            </AuthProvider>
          </Providers>
        </div>
      </body>
    </html>
  );
}
