"use client";

import Link from "next/link";
import Image from "next/image";
import AuthButton from "./components/AuthButton";
import { useState } from "react";

const navigation = [
    {
        name: "Home",
        href: "/",
    },
    {
        name: "About",
        href: "/about",
    },
    {
        name: "Contact Us",
        href: "/contact-us"
    },
];


export default function Navigation() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center gap-3">
                    <Image src="/image/logo.svg" alt="Ikikae" width={28} height={28} />
                    <span className="text-xs font-semibold tracking-[0.28em] uppercase">
                        Ikikae
                    </span>
                </Link>

                <nav className="hidden items-center gap-7 text-sm md:flex">
                    {navigation.map((item) => (
                        <Link
                            href={item.href}
                            key={item.name}
                            className="rounded-sm px-1 py-0.5 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted md:hidden"
                        aria-expanded={open}
                        aria-controls="mobile-nav"
                    >
                        Menu
                    </button>
                    <AuthButton />
                </div>
            </div>

            {open && (
                <div id="mobile-nav" className="border-t border-border md:hidden">
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-3">
                        {navigation.map((item) => (
                            <Link
                                href={item.href}
                                key={item.name}
                                onClick={() => setOpen(false)}
                                className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
