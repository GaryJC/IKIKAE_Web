"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getUserProfileByQRCode } from "@/lib/mottoService";

export default function QRProfilePage() {
    const params = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [redirecting, setRedirecting] = useState(false);
    const [countdown, setCountdown] = useState(null);

    useEffect(() => {
        if (params.qrCodeId) {
            fetchProfile(params.qrCodeId);
        }
    }, [params.qrCodeId]);

    useEffect(() => {
        if (profile?.motivationalUrl) {
            setCountdown(5);
        }
    }, [profile]);

    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            setRedirecting(true);
            window.location.href = profile.motivationalUrl;
            return;
        }

        const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, profile]);

    const fetchProfile = async (qrCodeId) => {
        setLoading(true);
        setError("");
        try {
            const result = await getUserProfileByQRCode(qrCodeId);
            if (result.success && result.profile) {
                setProfile(result.profile);
            } else {
                setError(result.error || "Profile not found");
            }
        } catch (err) {
            setError("Failed to load profile");
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || redirecting) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#080909] px-6 pt-24 text-white">
                <div className="text-center">
                    <div className="mx-auto h-5 w-5 rounded-full border-2 border-white/20 border-t-[#a26bff]" style={{ animation: "spin 0.75s linear infinite" }} />
                    <p className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-white/42">
                        {redirecting ? "Opening URL" : "Reading Patch"}
                    </p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(162,107,255,0.16),transparent_30%),#080909] px-6 pb-20 pt-32 text-white">
                <section className="mx-auto max-w-md rounded-[10px] border border-[#a26bff]/35 bg-[#a26bff]/10 p-8 text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#c5a2ff]">QR Experience</div>
                    <h1 className="mt-5 text-3xl font-black uppercase leading-tight">Patch not linked yet</h1>
                    <p className="mt-4 text-sm leading-7 text-white/65">
                        This QR exists, but it is not connected to a Dream Account. Create the account first, then ask the operator to link this shirt.
                    </p>
                    <div className="mt-8 grid gap-3">
                        <Link href="/userProfile/motto" className="inline-flex h-12 items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#c5a2ff]">
                            Create Account
                        </Link>
                        <Link href="/" className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/18 text-[11px] font-black uppercase text-white/70 transition hover:border-[#c5a2ff] hover:text-[#c5a2ff]">
                            Back Home
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(162,107,255,0.16),transparent_30%),#080909] px-6 pb-20 pt-32 text-white">
            <section className="mx-auto max-w-lg rounded-[10px] border border-[#a26bff]/35 bg-[#a26bff]/10 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.32)] md:p-8">
                <div className="flex items-start justify-between gap-6 border-b border-white/12 pb-6">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">QR Code</div>
                        <div className="mt-2 text-xl font-black uppercase">#{profile.qrCodeId || params.qrCodeId}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Status</div>
                        <div className="mt-2 text-sm font-black uppercase text-[#c5a2ff]">Linked</div>
                    </div>
                </div>

                <div className="border-b border-white/12 py-8 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Customer Account Page</div>
                    <div className="mt-2 text-2xl font-black uppercase">#{profile.id || "Account"}</div>
                    <div className="mt-7 text-4xl font-black leading-tight tracking-[-0.04em]">“{profile.motto}”</div>
                    <div className="mt-6 text-sm text-white/50">{profile.userName}</div>
                </div>

                <div className="pt-7">
                    {profile.motivationalUrl ? (
                        <>
                            <a
                                href={profile.motivationalUrl}
                                className="inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#c5a2ff]"
                            >
                                Open Motivational URL
                            </a>
                            {countdown !== null && countdown > 0 && (
                                <div className="mt-4 text-center text-xs font-medium text-white/48">
                                    Redirecting in {countdown}s
                                </div>
                            )}
                            <button
                                onClick={() => setCountdown(null)}
                                className="mt-4 h-10 w-full text-[11px] font-black uppercase text-white/48 transition hover:text-white"
                            >
                                Stay on account page
                            </button>
                        </>
                    ) : (
                        <Link
                            href={`/motto/${profile.id}`}
                            className="inline-flex h-12 w-full items-center justify-center rounded-[4px] border border-white/18 text-[11px] font-black uppercase text-white transition hover:border-[#c5a2ff] hover:text-[#c5a2ff]"
                        >
                            View Public Account
                        </Link>
                    )}
                </div>
            </section>
        </main>
    );
}
