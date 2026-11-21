import Link from "next/link";

export default function AboutPage() {
    return (
        <div className="mx-auto w-full max-w-6xl px-6 py-14">

            {/* Hero */}
            <div className="max-w-3xl">
                <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                    About
                </div>
                <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] md:text-5xl">
                    We do not inspire you.<br className="hidden md:block" /> We show up while you do the work.
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    Inspirational brands sell a feeling that fades the moment you close the tab.
                    IKIKAE is not that. The market is flooded with billboards and athletes.
                    We have been sold inspiration as a substitute for action, and it is not working.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    IKIKAE is built around you. You are the main protagonist. Not a celebrity, not an ambassador, not a mascot.
                    Your words. Your goal. Your body.
                </p>
            </div>

            <div className="my-12 border-t border-border" />

            {/* The System */}
            <div className="grid gap-10 md:grid-cols-2 md:items-start">
                <div>
                    <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                        The Product
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
                        Three layers. Built into every piece.
                    </h2>
                    <div className="mt-6 flex flex-col gap-6">
                        <div className="flex gap-4">
                            <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground pt-0.5 w-6 shrink-0">01</div>
                            <div>
                                <div className="text-sm font-semibold">Custom Motto Embroidery</div>
                                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                    Your personal motto, embroidered in thread matched to the fabric colour.
                                    Typically at the bottom corner. Visible up close. Invisible from a distance.
                                    Personal, not performative.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground pt-0.5 w-6 shrink-0">02</div>
                            <div>
                                <div className="text-sm font-semibold">Personalised Dream ID</div>
                                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                    A unique ID sewn into every piece you own. If you own multiple IKIKAE pieces,
                                    they all carry the same Dream ID — because it belongs to the dream, not the shirt.
                                    A quiet badge that says: this garment belongs to someone chasing something.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground pt-0.5 w-6 shrink-0">03</div>
                            <div>
                                <div className="text-sm font-semibold">NFC Smart Patch</div>
                                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                                    A washable, waterproof NFC chip on the shoulder. One tap launches your daily reminder.
                                    Works with any smartphone. No app required.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vision / quote cards */}
                <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-border bg-muted p-8">
                        <div className="flex items-center gap-3">
                            <img src="/image/logo.svg" alt="Ikikae" width={28} height={28} />
                            <div className="text-[11px] font-semibold tracking-[0.28em] uppercase">
                                生き変え
                            </div>
                        </div>
                        <div className="mt-6 text-sm italic leading-7">
                            "The dream ends when it is achieved. Then a new one begins."
                        </div>
                        <div className="mt-4 text-xs leading-5 text-muted-foreground">
                            Premium quality is not a positioning choice — it is a necessity.
                            The clothes need to last as long as the dream does.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-8">
                        <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                            The Customer
                        </div>
                        <div className="mt-3 text-sm font-semibold">The Quiet Achiever</div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Someone in the middle of a significant challenge — studying for the bar,
                            grinding through a degree, building something that matters.
                            They carry their commitment quietly. Not on social media. Not on a vision board. On their body.
                        </p>
                        <div className="mt-5 rounded-xl bg-muted px-5 py-4 text-xs italic leading-5 text-muted-foreground">
                            "Passed the bar. Already ordered the next one to start my next goal."
                        </div>
                    </div>
                </div>
            </div>

            <div className="my-12 border-t border-border" />

            {/* Brand voice */}
            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                        Brand Voice
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">No noise, just meaning.</h2>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        Clean. Minimal. Premium. Exclusive. We sound like a calm, confident person
                        who does not need to raise their voice to be heard. Someone who has been through
                        something hard, came out the other side, and does not need to talk about it — but wears it.
                    </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-6">
                    <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground mb-4">
                        What we would never do
                    </div>
                    <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                        <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">—</span> Use fake urgency or countdown timers</li>
                        <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">—</span> Be loud and salesy with aggressive popups</li>
                        <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">—</span> Make empty promises — "this will change your life"</li>
                        <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">—</span> Use generic stock photo models with no story</li>
                        <li className="flex gap-2"><span className="text-foreground font-medium shrink-0">—</span> Cheapen the personalisation system</li>
                    </ul>
                </div>
            </div>

            {/* CTA */}
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/userProfile/motto"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
                >
                    Register Your Dream
                </Link>
                <Link
                    href="/"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted"
                >
                    Back Home
                </Link>
            </div>

        </div>
    );
}
