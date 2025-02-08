"use client"
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../lib/AuthContext"
import { useState } from "react";
import { Button } from "@mui/material";

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

    return (
        <div>
            {user ? (
                <div className="flex items-center gap-2">
                    <Image className="rounded-full" src={user.photoURL} alt="User Profile" width={32} height={32} />
                    <Link href={"/userProfile"}>{user.displayName}</Link>
                </div>
            ) : (
                <Button
                    variant="contained"
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                >
                    {isSigningIn ? "Signing in..." : "Sign In"}
                </Button>
            )}
        </div>
    );
}
