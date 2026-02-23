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
            <div className="h-9 w-24 rounded-full border border-border bg-muted" />
        );
    }

    return (
        <div>
            {user ? (
                <div className="flex items-center gap-2">
                    <Image className="rounded-full" src={user.photoURL} alt="User Profile" width={32} height={32} />
                    <Link
                        href={"/userProfile"}
                        className="max-w-[18ch] truncate text-sm text-muted-foreground hover:text-foreground"
                    >
                        {user.displayName}
                    </Link>
                </div>
            ) : (
                <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSigningIn ? "Signing in..." : "Sign In"}
                </button>
            )}
        </div>
    );
}
