"use client"

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import QRCode from "react-qr-code";
import { createQRCodeForProduction } from "@/lib/mottoService";

export default function QRGeneratorPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const [qrCodeId, setQrCodeId] = useState("");
    const [generatedUrl, setGeneratedUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    const generateQRCodeUrl = async () => {
        const id = qrCodeId.trim().toUpperCase();
        if (!id) return;

        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const result = await createQRCodeForProduction(id);
            if (result.success) {
                const qrCodeUrl = `${window.location.origin}/qr/${id}`;
                setGeneratedUrl(qrCodeUrl);
                setMessage({ type: "success", text: "QR created. Blank shirt is ready for operator scan." });
            } else {
                setMessage({ type: "error", text: result.error });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to create QR code." });
            console.error("Error creating QR code:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
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
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff9a76]">T-shirt Prep</div>
                    <h1 className="mt-5 text-3xl font-black uppercase leading-tight">Sign in to generate QR</h1>
                    <button onClick={signInWithGoogle} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76]">
                        Sign In
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_28%),#080909] px-6 pb-20 pt-32 text-white">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <section>
                    <Link href="/userProfile" className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42 hover:text-[#ff9a76]">
                        Account / Back
                    </Link>
                    <div className="mt-8 text-[11px] font-black uppercase tracking-[0.32em] text-[#33d47a]">T-shirt Prep</div>
                    <h1 className="mt-5 text-5xl font-black uppercase leading-[0.96] tracking-[-0.04em]">
                        Generate
                        <br />
                        Random QR.
                    </h1>
                    <p className="mt-6 max-w-md text-sm font-medium leading-7 text-white/65">
                        Create a QR code record before printing it on a blank shirt. It stays unassigned until the operator links it to a customer's Dream Account.
                    </p>
                    <div className="mt-10 space-y-4">
                        {["Generate random QR code", "Print QR on blank shirt", "Shirt ready for operator"].map((label, index) => (
                            <div key={label} className="flex items-center gap-4 rounded-[8px] border border-[#33d47a]/25 bg-[#33d47a]/10 px-4 py-4">
                                <span className="text-xl font-black text-[#33d47a]">0{index + 1}</span>
                                <span className="text-sm font-black uppercase">{label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[10px] border border-white/10 bg-[#151718] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:p-8">
                    <div className="border-b border-white/12 pb-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Production ID</div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <input
                                value={qrCodeId}
                                onChange={(event) => setQrCodeId(event.target.value.toUpperCase())}
                                placeholder="QRCODE2432"
                                className="h-12 flex-1 rounded-[6px] border border-white/12 bg-white/[0.06] px-4 text-sm uppercase text-white placeholder:text-white/28 outline-none transition focus:border-[#33d47a]"
                            />
                            <button
                                onClick={generateQRCodeUrl}
                                disabled={!qrCodeId.trim() || saving}
                                className="h-12 rounded-[4px] bg-white px-6 text-[11px] font-black uppercase text-black transition hover:bg-[#33d47a] disabled:opacity-40"
                            >
                                {saving ? "Saving" : "Generate"}
                            </button>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`mt-6 rounded-[6px] border px-4 py-3 text-sm ${message.type === "success" ? "border-[#33d47a]/40 bg-[#33d47a]/10 text-[#78eba7]" : "border-[#ff9a76]/40 bg-[#ff9a76]/10 text-[#ffb395]"}`}>
                            {message.text}
                        </div>
                    )}

                    {generatedUrl && (
                        <div className="mt-8">
                            <div className="mx-auto w-fit rounded-[8px] bg-white p-5">
                                <QRCode value={generatedUrl} size={220} level="M" />
                            </div>
                            <div className="mt-6 rounded-[6px] border border-white/10 bg-black/24 px-4 py-3 text-center text-xs text-white/58 break-all">
                                {generatedUrl}
                            </div>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <Link href="/admin/qr-codes" className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/20 text-[11px] font-black uppercase text-white transition hover:border-[#33d47a] hover:text-[#33d47a]">
                                    Operator Link
                                </Link>
                                <button onClick={() => window.print()} className="inline-flex h-12 items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#33d47a]">
                                    Print QR
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
