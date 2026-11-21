"use client"

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { addMotto, getUserMotto } from "@/lib/mottoService";
import { readConceptDraft, clearConceptDraft } from "@/lib/conceptDraft";
import Link from "next/link";

const fieldClass = "mt-3 w-full rounded-[6px] border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#ff9a76] disabled:opacity-50";

export default function MottoPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const [motto, setMotto] = useState("");
    const [mottoId, setMottoId] = useState("");
    const [motivationalUrl, setMotivationalUrl] = useState("");
    const [visibility, setVisibility] = useState("public");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedId, setGeneratedId] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [existingMotto, setExistingMotto] = useState(null);
    const [loadingMotto, setLoadingMotto] = useState(true);
    const [shareUrl, setShareUrl] = useState("");
    const [copyStatus, setCopyStatus] = useState("");
    const [mottoLoadedForUid, setMottoLoadedForUid] = useState(null);
    const mottoEdited = useRef(false);
    const conceptPrefilledForUid = useRef(null);

    useEffect(() => {
        let cancelled = false;

        const loadUserMotto = async () => {
            setExistingMotto(null);
            setSuccess(false);
            setGeneratedId("");
            setError("");
            setCopyStatus("");
            setMottoLoadedForUid(null);

            if (!user) {
                setLoadingMotto(false);
                return;
            }

            setLoadingMotto(true);
            try {
                const result = await getUserMotto(user);
                if (!cancelled && result.success) {
                    setExistingMotto(result.motto || null);
                    setMottoLoadedForUid(user.uid);
                }
            } catch (err) {
                console.error("Error loading motto:", err);
            } finally {
                if (!cancelled) {
                    setLoadingMotto(false);
                }
            }
        };

        loadUserMotto();
        return () => {
            cancelled = true;
        };
    }, [user?.uid]);

    useEffect(() => {
        if (loading || loadingMotto || !user || mottoLoadedForUid !== user.uid || existingMotto) return;
        if (mottoEdited.current || conceptPrefilledForUid.current === user.uid) return;
        if (new URLSearchParams(window.location.search).get("draft") !== "concept") return;

        const draft = readConceptDraft();
        conceptPrefilledForUid.current = user.uid;
        if (draft) setMotto((current) => current || draft);
    }, [loading, loadingMotto, user, mottoLoadedForUid, existingMotto]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setShareUrl(window.location.origin);
        }
    }, []);

    const copyLink = async (id) => {
        if (!shareUrl || !id) return;
        try {
            await navigator.clipboard.writeText(`${shareUrl}/motto/${id}`);
            setCopyStatus("Copied");
        } catch {
            setCopyStatus("Copy failed");
        } finally {
            setTimeout(() => setCopyStatus(""), 1600);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!motto.trim() || !mottoId.trim()) {
            setError("Dream ID and motto are required.");
            return;
        }

        setIsSubmitting(true);
        setError("");
        try {
            const result = await addMotto(
                { motto, mottoId: mottoId.trim(), visibility, motivationalUrl: motivationalUrl.trim() },
                user
            );

            if (result.success) {
                clearConceptDraft();
                setGeneratedId(result.id);
                setSuccess(true);
                setExistingMotto({
                    id: result.id,
                    motto: motto.trim(),
                    visibility,
                    motivationalUrl: motivationalUrl.trim(),
                    createdAt: null,
                });
                setMotto("");
                setMottoId("");
                setMotivationalUrl("");
            } else {
                setError(result.error || "Failed to save. Please try again.");
            }
        } catch (err) {
            console.error("Error adding motto:", err);
            setError("Failed to save. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff9a76]">Dream Account</div>
                    <h1 className="mt-5 text-3xl font-black uppercase leading-tight">Sign in to create your account</h1>
                    <p className="mt-4 text-sm leading-6 text-white/62">Your Dream ID, motto, and reminder URL are attached to your garment workflow.</p>
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

    const activeMotto = existingMotto || (success ? { id: generatedId, motto, visibility, motivationalUrl } : null);

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_28%),#080909] px-6 pb-20 pt-32 text-white">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.88fr_1.12fr]">
                <section>
                    <Link href="/userProfile" className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42 hover:text-[#ff9a76]">
                        Account / Back
                    </Link>
                    <div className="mt-8 text-[11px] font-black uppercase tracking-[0.32em] text-[#ff9a76]">Customer</div>
                    <h1 className="mt-5 text-5xl font-black uppercase leading-[0.96] tracking-[-0.04em]">
                        Create
                        <br />
                        Account.
                    </h1>
                    <p className="mt-6 max-w-md text-sm font-medium leading-7 text-white/65">
                        Choose your Dream ID, write the motto that gets embroidered, and set the URL that opens when the QR patch is scanned.
                    </p>

                    <div className="mt-10 space-y-4">
                        {[
                            ["01", "Choose Account ID + write motto"],
                            ["02", "Add shirt to cart"],
                            ["03", "Enter ID at checkout"],
                            ["04", "Receive QR + embroidered motto"],
                        ].map(([number, label]) => (
                            <div key={number} className="flex items-center gap-4 rounded-[8px] border border-white/10 bg-white/[0.05] px-4 py-4">
                                <span className="text-xl font-black text-[#ff9a76]">{number}</span>
                                <span className="text-sm font-black uppercase">{label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[10px] border border-white/10 bg-[#151718] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:p-8">
                    {activeMotto ? (
                        <div>
                            <div className="flex items-start justify-between gap-5 border-b border-white/12 pb-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Account ID</div>
                                    <div className="mt-2 text-2xl font-black uppercase">#{activeMotto.id}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Status</div>
                                    <div className="mt-2 text-sm font-black uppercase text-[#ff9a76]">Synchronized</div>
                                </div>
                            </div>

                            <div className="border-b border-white/12 py-7">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Motto</div>
                                <div className="mt-3 text-3xl font-black leading-tight">“{activeMotto.motto}”</div>
                                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Visibility</div>
                                        <div className="mt-2 text-sm uppercase text-white/72">{activeMotto.visibility}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Reminder URL</div>
                                        <div className="mt-2 truncate text-sm text-white/72">{activeMotto.motivationalUrl || "Not set"}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-7">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Share Link</div>
                                <div className="mt-3 break-all rounded-[6px] border border-white/10 bg-black/24 px-4 py-3 text-xs text-white/60">
                                    {shareUrl ? `${shareUrl}/motto/${activeMotto.id}` : "Loading"}
                                </div>
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={() => copyLink(activeMotto.id)}
                                        className="inline-flex h-11 flex-1 items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76]"
                                    >
                                        {copyStatus || "Copy Link"}
                                    </button>
                                    <Link
                                        href="/admin/qr-codes"
                                        className="inline-flex h-11 flex-1 items-center justify-center rounded-[4px] border border-white/20 text-[11px] font-black uppercase text-white transition hover:border-[#ff9a76] hover:text-[#ff9a76]"
                                    >
                                        Link QR
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Account ID</span>
                                    <input
                                        value={mottoId}
                                        onChange={(event) => setMottoId(event.target.value)}
                                        placeholder="e.g. BAR2026"
                                        maxLength={12}
                                        disabled={isSubmitting}
                                        className={fieldClass}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Motivational URL</span>
                                    <input
                                        type="url"
                                        value={motivationalUrl}
                                        onChange={(event) => setMotivationalUrl(event.target.value)}
                                        placeholder="https://youtube.com/..."
                                        disabled={isSubmitting}
                                        className={fieldClass}
                                    />
                                </label>
                            </div>

                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Motto</span>
                                <textarea
                                    value={motto}
                                    onChange={(event) => {
                                        mottoEdited.current = true;
                                        setMotto(event.target.value);
                                    }}
                                    placeholder="Stay in it."
                                    rows={5}
                                    disabled={isSubmitting}
                                    className={`${fieldClass} resize-none`}
                                />
                            </label>

                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Visibility</div>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    {["public", "private"].map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setVisibility(item)}
                                            className={`h-11 rounded-[4px] border text-[11px] font-black uppercase transition ${visibility === item
                                                ? "border-[#ff9a76] bg-[#ff9a76] text-black"
                                                : "border-white/14 text-white/68 hover:border-white/36 hover:text-white"
                                                }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-[6px] border border-[#ff9a76]/40 bg-[#ff9a76]/10 px-4 py-3 text-sm text-[#ffb395]">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !motto.trim() || !mottoId.trim()}
                                className="flex h-12 w-full items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76] disabled:opacity-40"
                            >
                                {isSubmitting ? "Synchronizing" : "Create Dream Account"}
                            </button>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
