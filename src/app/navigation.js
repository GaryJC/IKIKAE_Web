"use client";

import Link from "next/link";
import AuthButton from "./components/AuthButton";
import { useState } from "react";

const navigation = [
    {
        name: "Collections",
        href: "/#inventory",
    },
    {
        name: "System",
        href: "/#system",
    },
    {
        name: "Materials",
        href: "/#workflow",
    },
    {
        name: "About",
        href: "/about",
    },
];


export default function Navigation() {
    const [open, setOpen] = useState(false);

    return (
        <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[rgba(8,9,9,0.92)] text-white shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
                <Link href="/" className="flex items-center gap-3">
                    <span className="text-xl font-black uppercase tracking-[-0.06em]">
                        IKIKAE
                    </span>
                </Link>

                <nav className="hidden items-center gap-14 text-[11px] font-black uppercase tracking-[0.08em] md:flex">
                    {navigation.map((item) => (
                        <Link
                            href={item.href}
                            key={item.name}
                            className="rounded-sm px-1 py-0.5 text-white/72 transition hover:text-[#ff9a76] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <AuthButton />
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="inline-flex h-9 w-9 items-center justify-center text-2xl leading-none text-white hover:text-[#ff9a76]"
                        aria-expanded={open}
                        aria-controls="mobile-nav"
                        aria-label="Menu"
                    >
                        ≡
                    </button>
                </div>
            </div>

            {open && (
                <div id="mobile-nav" className="border-t border-white/10 bg-[#080909] md:hidden">
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-6 py-4">
                        {navigation.map((item) => (
                            <Link
                                href={item.href}
                                key={item.name}
                                onClick={() => setOpen(false)}
                                className="rounded-[4px] px-3 py-3 text-[12px] font-black uppercase tracking-[0.08em] text-white/70 hover:bg-white/10 hover:text-white"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}

{/* <button onClick={() => signIn()}>Login</button> */ }
