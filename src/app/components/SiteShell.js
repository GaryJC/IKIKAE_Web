"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "../../lib/AuthContext";
import Navigation from "../navigation";
import OpeningAnimation from "./OpeningAnimation";

export default function SiteShell({ children, hasSeenIntro }) {
  const pathname = usePathname();
  const isConcept = pathname === "/concept" || pathname.startsWith("/concept/");

  // The concept is deliberately local: mounting AuthProvider would also prepare
  // a Firestore user profile, even though this page does not need an account.
  if (isConcept) {
    return (
      <div className="min-h-screen w-full" style={{ overflowX: "clip" }}>
        <main className="w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <AuthProvider>
        <OpeningAnimation enabled={!hasSeenIntro} />
        <Navigation />
        <main className="w-full">{children}</main>
      </AuthProvider>
    </div>
  );
}
