"use client"
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext"
import { useState } from "react";

export default function AuthButtons() {
    const { user, loading, signInWithGoogle } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleSignIn = async () => {
        setIsSigningIn(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Sign in error:", error);
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <div className="h-9 w-24 rounded-[4px] border border-white/10 bg-white/10" />
        );
    }

    return (
        <div>
            {user ? (
                <div className="flex items-center gap-2">
                    {user.photoURL && (
                        <Image className="rounded-full" src={user.photoURL} alt="User Profile" width={30} height={30} />
                    )}
                    <Link
                        href={"/userProfile"}
                        className="hidden max-w-[16ch] truncate text-[11px] font-black uppercase tracking-[0.08em] text-white/72 hover:text-[#ff9a76] lg:block"
                    >
                        {user.displayName}
                    </Link>
                </div>
            ) : (
                <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="inline-flex h-9 items-center justify-center rounded-[4px] border border-white/30 px-4 text-[11px] font-black uppercase tracking-[0.05em] text-white transition hover:border-[#ff9a76] hover:text-[#ff9a76] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSigningIn ? "Signing In" : "Sign In"}
                </button>
            )}
        </div>
    );
}
