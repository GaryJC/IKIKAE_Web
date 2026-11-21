"use client"

import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getUserMotto } from "@/lib/mottoService";

export default function UserProfile() {
    const { user, loading, signOutUser, signInWithGoogle } = useAuth();
    const isAdmin = true;
    const [motto, setMotto] = useState(null);
    const [loadingMotto, setLoadingMotto] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const checkUserMotto = async () => {
            setMotto(null);

            if (!user) {
                setLoadingMotto(false);
                return;
            }

            setLoadingMotto(true);
            try {
                const result = await getUserMotto(user);
                if (!cancelled && result.success) {
                    setMotto(result.motto || null);
                }
            } catch (error) {
                console.error("Error checking motto:", error);
            } finally {
                if (!cancelled) {
                    setLoadingMotto(false);
                }
            }
        };

        checkUserMotto();
        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    if (loading || loadingMotto) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#080909] pt-24">
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-[#ff9a76]" style={{ animation: "spin 0.75s linear infinite" }} />
            </div>
        );
    }

    if (!user) {
        return (
            <main className="min-h-screen bg-[#080909] px-6 pt-32 text-white">
                <section className="mx-auto max-w-md rounded-[10px] border border-white/10 bg-white/[0.06] p-8 text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff9a76]">Account System</div>
                    <h1 className="mt-5 text-3xl font-black uppercase leading-tight">Sign in to continue</h1>
                    <p className="mt-4 text-sm leading-6 text-white/62">Create and manage the account linked to your garment.</p>
                    <button
                        onClick={signInWithGoogle}
                        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76]"
                    >
                        Sign In
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_28%),#080909] px-6 pb-20 pt-32 text-white">
            <div className="mx-auto max-w-6xl">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                    <section>
                        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff9a76]">Account System</div>
                        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.96] tracking-[-0.04em]">
                            Your Dream
                            <br />
                            Account.
                        </h1>
                        <p className="mt-6 max-w-md text-sm font-medium leading-7 text-white/65">
                            Manage your identity, motto, motivational URL, and production QR workflow from one place.
                        </p>

                        <div className="mt-10 rounded-[10px] border border-white/10 bg-white/[0.06] p-5">
                            <div className="flex items-center gap-4">
                                {user.photoURL && (
                                    <Image src={user.photoURL} alt="Avatar" width={46} height={46} className="rounded-full" />
                                )}
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-black uppercase">{user.displayName || "IKIKAE Customer"}</div>
                                    <div className="mt-1 truncate text-xs text-white/50">{user.email}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[10px] border border-white/10 bg-[#151718] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:p-8">
                        <div className="flex items-start justify-between gap-6 border-b border-white/12 pb-6">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Account ID</div>
                                <div className="mt-2 text-2xl font-black uppercase">{motto ? `#${motto.id}` : "Unassigned"}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Status</div>
                                <div className={`mt-2 text-sm font-black uppercase ${motto ? "text-[#ff9a76]" : "text-white/42"}`}>
                                    {motto ? "Synchronized" : "Pending"}
                                </div>
                            </div>
                        </div>

                        {motto ? (
                            <div className="border-b border-white/12 py-7">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Motto</div>
                                <div className="mt-3 text-3xl font-black leading-tight">“{motto.motto}”</div>
                                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Visibility</div>
                                        <div className="mt-2 text-sm uppercase text-white/72">{motto.visibility}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Likes</div>
                                        <div className="mt-2 text-sm uppercase text-white/72">{motto.likeCount || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Patch URL</div>
                                        <div className="mt-2 truncate text-sm text-white/72">{motto.motivationalUrl || "Not set"}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="border-b border-white/12 py-8 text-sm leading-7 text-white/58">
                                No Dream Account has been created yet. Start with an account ID and motto before production links a QR code to the shirt.
                            </div>
                        )}

                        <div className="grid gap-3 pt-7 sm:grid-cols-2">
                            <Link
                                href="/userProfile/motto"
                                className="inline-flex h-12 items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76]"
                            >
                                {motto ? "View Dream" : "Create Dream"}
                            </Link>
                            <Link
                                href={motto ? `/motto/${motto.id}` : "/userProfile/motto"}
                                className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/20 text-[11px] font-black uppercase text-white transition hover:border-[#ff9a76] hover:text-[#ff9a76]"
                            >
                                Public Page
                            </Link>
                            {isAdmin && (
                                <>
                                    <Link
                                        href="/admin/qr-generator"
                                        className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/20 text-[11px] font-black uppercase text-white transition hover:border-[#ff9a76] hover:text-[#ff9a76]"
                                    >
                                        Generate QR
                                    </Link>
                                    <Link
                                        href="/admin/qr-codes"
                                        className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/20 text-[11px] font-black uppercase text-white transition hover:border-[#ff9a76] hover:text-[#ff9a76]"
                                    >
                                        Operator Link
                                    </Link>
                                </>
                            )}
                            <button
                                onClick={signOutUser}
                                className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/20 text-[11px] font-black uppercase text-white/62 transition hover:border-white/40 hover:text-white sm:col-span-2"
                            >
                                Sign Out
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
