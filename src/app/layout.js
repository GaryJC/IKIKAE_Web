import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navigation from "./navigation";
import { AuthProvider } from "../lib/AuthContext";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-screen w-full overflow-x-hidden">
          <Providers>
            <AuthProvider>
              <Navigation />
              <main className="w-full">{children}</main>
            </AuthProvider>
          </Providers>
        </div>
      </body>
    </html>
  );
}
