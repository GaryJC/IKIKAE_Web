"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getMottoById, getMottoLikeStatus, likeMotto } from "@/lib/mottoService";

export default function MottoSharePage() {
    const params = useParams();
    const { user, loading, signInWithGoogle } = useAuth();
    const [motto, setMotto] = useState(null);
    const [loadingMotto, setLoadingMotto] = useState(true);
    const [error, setError] = useState("");
    const [likeCount, setLikeCount] = useState(0);
    const [liked, setLiked] = useState(false);
    const [liking, setLiking] = useState(false);
    const [copyStatus, setCopyStatus] = useState("");

    useEffect(() => {
        const loadMotto = async () => {
            if (!params.id || loading) return;
            setLoadingMotto(true);
            setError("");
            try {
                const result = await getMottoById(params.id, user);
                if (result.success) {
                    setMotto(result.motto);
                    setLikeCount(result.motto.likeCount || 0);
                    if (user) {
                        const likeStatus = await getMottoLikeStatus(params.id, user);
                        if (likeStatus.success) setLiked(likeStatus.liked);
                    }
                } else {
                    setError(result.error || "Motto not found");
                }
            } catch (err) {
                console.error("Error loading motto:", err);
                setError("Failed to load motto");
            } finally {
                setLoadingMotto(false);
            }
        };
        loadMotto();
    }, [params.id, user, loading]);

    const handleCopy = async () => {
        const link = typeof window !== "undefined" ? window.location.href : "";
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopyStatus("Copied.");
        } catch {
            setCopyStatus("Copy failed.");
        } finally {
            setTimeout(() => setCopyStatus(""), 1500);
        }
    };

    const handleLike = async () => {
        if (!user || liking) return;
        setLiking(true);
        try {
            const result = await likeMotto(params.id, user);
            if (result.success) {
                setLiked(true);
                if (!result.alreadyLiked) setLikeCount(result.likeCount || likeCount + 1);
            }
        } catch (err) {
            console.error("Error liking motto:", err);
        } finally {
            setLiking(false);
        }
    };

    if (loading || loadingMotto) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div
                    className="h-5 w-5 rounded-full border-2 border-border border-t-foreground"
                    style={{ animation: "spin 0.75s linear infinite" }}
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto w-full max-w-md px-6 py-20 text-center">
                <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    Not Found
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{error}</h1>
                {error === "This motto is private" && !user && (
                    <button
                        onClick={signInWithGoogle}
                        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
                    >
                        Sign in to view
                    </button>
                )}
                <div className="mt-4">
                    <Link
                        href="/"
                        className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-foreground hover:bg-muted"
                    >
                        Back Home
                    </Link>
                </div>
            </div>
        );
    }

    if (!motto) return null;

    return (
        <div className="mx-auto w-full max-w-xl px-6 py-14">

            {/* Eyebrow */}
            <div className="mb-8">
                <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    Dream · {motto.userName}
                </div>
            </div>

            {/* Motto card — the centrepiece */}
            <div className="rounded-2xl border border-border bg-foreground px-8 py-10 text-background">
                <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-background/50">
                    Dream ID
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
                    #{motto.id}
                </div>
                <div className="mt-6 text-xl italic leading-8 text-background/90 md:text-2xl">
                    "{motto.motto}"
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-3">
                <div className="flex gap-2">
                    <button
                        onClick={handleLike}
                        disabled={!user || liked || liking}
                        className={`flex-1 flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors ${
                            liked
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background text-foreground hover:bg-muted disabled:opacity-50"
                        }`}
                    >
                        {liked ? "Respected" : liking ? "..." : "Respect"}
                        <span className="text-xs opacity-60">{likeCount > 0 ? likeCount : ""}</span>
                    </button>
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex h-11 items-center justify-center rounded-full border border-border bg-background text-sm font-medium text-foreground hover:bg-muted"
                    >
                        {copyStatus || "Copy Link"}
                    </button>
                </div>

                {!user && (
                    <p className="text-center text-xs text-muted-foreground">
                        Sign in to respect this dream.{" "}
                        <button onClick={signInWithGoogle} className="underline hover:text-foreground">
                            Sign in
                        </button>
                    </p>
                )}

                <Link
                    href="/"
                    className="flex h-11 items-center justify-center rounded-full border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    Back Home
                </Link>
            </div>

            {/* Footer note */}
            <p className="mt-8 text-center text-xs text-muted-foreground">
                This motto is registered at ikikae.com. It is sewn into their garment.
            </p>

        </div>
    );
}
