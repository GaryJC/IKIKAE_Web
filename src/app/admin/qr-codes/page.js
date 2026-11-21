"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
    linkQRCodeToUser,
    getAllQRCodes,
    getQRCodeById
} from "@/lib/mottoService";

export default function QRCodeManagementPage() {
    const { user, loading, signInWithGoogle } = useAuth();
    const [qrCodes, setQrCodes] = useState([]);
    const [loadingQRCodes, setLoadingQRCodes] = useState(true);
    const [scannedQRCode, setScannedQRCode] = useState("");
    const [linkPanel, setLinkPanel] = useState({ open: false, qrCodeId: "", userEmail: "" });
    const [message, setMessage] = useState({ type: "", text: "" });
    const [scanning, setScanning] = useState(false);
    const [qrPreview, setQrPreview] = useState(null);

    useEffect(() => {
        if (user) {
            loadQRCodes();
        } else {
            setLoadingQRCodes(false);
        }
    }, [user]);

    const loadQRCodes = async () => {
        setLoadingQRCodes(true);
        try {
            const result = await getAllQRCodes();
            if (result.success) {
                setQrCodes(result.qrCodes);
            } else {
                setMessage({ type: "error", text: result.error });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to load QR codes." });
        } finally {
            setLoadingQRCodes(false);
        }
    };

    const handleScanQRCode = async () => {
        const id = scannedQRCode.trim().toUpperCase();
        if (!id) {
            setMessage({ type: "error", text: "Please enter a QR code ID." });
            return;
        }

        setScanning(true);
        setMessage({ type: "", text: "" });
        try {
            const result = await getQRCodeById(id);
            if (result.success) {
                const qrCode = result.qrCode;
                if (qrCode.isLinked) {
                    setMessage({ type: "info", text: `${qrCode.qrCodeId} is already linked to ${qrCode.linkedUserEmail}.` });
                } else {
                    setLinkPanel({ open: true, qrCodeId: qrCode.qrCodeId, userEmail: "" });
                }
            } else {
                setMessage({ type: "error", text: result.error });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to scan QR code." });
        } finally {
            setScanning(false);
        }
    };

    const handleLinkQRCode = async () => {
        if (!linkPanel.userEmail.trim()) {
            setMessage({ type: "error", text: "Please enter customer email." });
            return;
        }

        try {
            const result = await linkQRCodeToUser(linkPanel.qrCodeId, linkPanel.userEmail.trim());
            if (result.success) {
                setMessage({ type: "success", text: `${linkPanel.qrCodeId} linked to ${linkPanel.userEmail}.` });
                setLinkPanel({ open: false, qrCodeId: "", userEmail: "" });
                setScannedQRCode("");
                loadQRCodes();
            } else {
                setMessage({ type: "error", text: result.error });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Failed to link QR code." });
        }
    };

    const previewQRCode = (qrCodeId) => {
        setQrPreview({
            qrCodeId,
            url: `${window.location.origin}/qr/${qrCodeId}`
        });
    };

    if (loading || loadingQRCodes) {
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
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff8a24]">Operator</div>
                    <h1 className="mt-5 text-3xl font-black uppercase leading-tight">Sign in to link QR</h1>
                    <button onClick={signInWithGoogle} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff8a24]">
                        Sign In
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_28%),#080909] px-6 pb-20 pt-32 text-white">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
                    <section>
                        <Link href="/userProfile" className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42 hover:text-[#ff8a24]">
                            Account / Back
                        </Link>
                        <div className="mt-8 text-[11px] font-black uppercase tracking-[0.32em] text-[#ff8a24]">Operator</div>
                        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.96] tracking-[-0.04em]">
                            Scan QR
                            <br />
                            On Shirt.
                        </h1>
                        <p className="mt-6 max-w-md text-sm font-medium leading-7 text-white/65">
                            Enter the QR ID printed on the blank shirt, then link it to the customer's account email after their Dream Account exists.
                        </p>

                        <div className="mt-10 rounded-[10px] border border-[#ff8a24]/28 bg-[#ff8a24]/10 p-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">QR Code ID</div>
                            <input
                                value={scannedQRCode}
                                onChange={(event) => setScannedQRCode(event.target.value.toUpperCase())}
                                placeholder="QRCODE2432"
                                className="mt-3 h-12 w-full rounded-[6px] border border-white/12 bg-black/20 px-4 text-sm uppercase text-white placeholder:text-white/28 outline-none transition focus:border-[#ff8a24]"
                            />
                            <button
                                onClick={handleScanQRCode}
                                disabled={!scannedQRCode.trim() || scanning}
                                className="mt-3 h-12 w-full rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff8a24] disabled:opacity-40"
                            >
                                {scanning ? "Scanning" : "Scan QR"}
                            </button>
                        </div>
                    </section>

                    <section className="space-y-5">
                        {message.text && (
                            <div className={`rounded-[6px] border px-4 py-3 text-sm ${message.type === "success" ? "border-[#33d47a]/40 bg-[#33d47a]/10 text-[#78eba7]" : message.type === "info" ? "border-white/18 bg-white/[0.06] text-white/70" : "border-[#ff9a76]/40 bg-[#ff9a76]/10 text-[#ffb395]"}`}>
                                {message.text}
                            </div>
                        )}

                        {linkPanel.open && (
                            <div className="rounded-[10px] border border-[#ff8a24]/35 bg-[#ff8a24]/10 p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">DB relation created</div>
                                <h2 className="mt-2 text-2xl font-black uppercase">ID #{linkPanel.qrCodeId} {"->"} Account</h2>
                                <input
                                    value={linkPanel.userEmail}
                                    onChange={(event) => setLinkPanel({ ...linkPanel, userEmail: event.target.value })}
                                    placeholder="customer@example.com"
                                    type="email"
                                    className="mt-5 h-12 w-full rounded-[6px] border border-white/12 bg-black/20 px-4 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#ff8a24]"
                                />
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={() => setLinkPanel({ open: false, qrCodeId: "", userEmail: "" })}
                                        className="h-12 flex-1 rounded-[4px] border border-white/18 text-[11px] font-black uppercase text-white/70 transition hover:border-white/40 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLinkQRCode}
                                        className="h-12 flex-1 rounded-[4px] bg-white text-[11px] font-black uppercase text-black transition hover:bg-[#ff8a24]"
                                    >
                                        Link Customer
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-hidden rounded-[10px] border border-white/10 bg-[#151718] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
                            <div className="flex items-center justify-between gap-5 border-b border-white/10 px-5 py-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Production Records</div>
                                    <h2 className="mt-1 text-xl font-black uppercase">QR Inventory</h2>
                                </div>
                                <Link href="/admin/qr-generator" className="hidden rounded-[4px] border border-white/18 px-4 py-3 text-[11px] font-black uppercase text-white/72 transition hover:border-[#ff8a24] hover:text-[#ff8a24] sm:inline-flex">
                                    Generate QR
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                                        <tr>
                                            <th className="px-5 py-4">QR Code</th>
                                            <th className="px-5 py-4">Linked User</th>
                                            <th className="px-5 py-4">Status</th>
                                            <th className="px-5 py-4">Linked At</th>
                                            <th className="px-5 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/8">
                                        {qrCodes.length === 0 ? (
                                            <tr>
                                                <td className="px-5 py-8 text-center text-white/45" colSpan={5}>No QR codes created yet.</td>
                                            </tr>
                                        ) : (
                                            qrCodes.map((qrCode) => (
                                                <tr key={qrCode.id} className="text-white/72">
                                                    <td className="px-5 py-4 font-black uppercase text-white">{qrCode.qrCodeId}</td>
                                                    <td className="px-5 py-4">{qrCode.linkedUserEmail || "Unassigned"}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`rounded-[4px] px-3 py-1 text-[10px] font-black uppercase ${qrCode.isLinked ? "bg-[#33d47a]/15 text-[#78eba7]" : "bg-[#ff8a24]/15 text-[#ffb06a]"}`}>
                                                            {qrCode.isLinked ? "Linked" : "Blank Shirt"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {qrCode.linkedAt ? new Date(qrCode.linkedAt.toDate()).toLocaleString() : "-"}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => previewQRCode(qrCode.qrCodeId)} className="rounded-[4px] border border-white/16 px-3 py-2 text-[10px] font-black uppercase text-white/70 hover:border-white/36 hover:text-white">
                                                                View
                                                            </button>
                                                            {!qrCode.isLinked && (
                                                                <button onClick={() => setLinkPanel({ open: true, qrCodeId: qrCode.qrCodeId, userEmail: "" })} className="rounded-[4px] bg-white px-3 py-2 text-[10px] font-black uppercase text-black hover:bg-[#ff8a24]">
                                                                    Link
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {qrPreview && (
                <div className="fixed inset-0 z-[60] grid place-items-center bg-black/72 px-6 backdrop-blur">
                    <div className="w-full max-w-md rounded-[10px] border border-white/10 bg-[#151718] p-6 text-white">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">QR Preview</div>
                                <h2 className="mt-2 text-2xl font-black uppercase">{qrPreview.qrCodeId}</h2>
                            </div>
                            <button onClick={() => setQrPreview(null)} className="text-2xl text-white/60 hover:text-white" aria-label="Close">×</button>
                        </div>
                        <div className="mx-auto mt-6 w-fit rounded-[8px] bg-white p-5">
                            <QRCode value={qrPreview.url} size={220} level="M" />
                        </div>
                        <div className="mt-5 break-all rounded-[6px] border border-white/10 bg-black/24 px-4 py-3 text-center text-xs text-white/58">
                            {qrPreview.url}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
