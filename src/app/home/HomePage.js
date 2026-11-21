import Link from "next/link";
import RevealOnScroll from "../components/RevealOnScroll";

const systemDetails = [
    {
        number: "01",
        title: "Custom Motto Embroidery",
        description:
            "Your personal mantra is stitched to the garment with quiet placement, durable thread, and permanent meaning.",
    },
    {
        number: "02",
        title: "Personalized Dream ID",
        description:
            "A unique serial code ties your apparel, account, QR code, and operator record into one traceable system.",
    },
    {
        number: "03",
        title: "MEC Smart Patch",
        description:
            "The QR/NFC patch opens your account page and motivational URL without needing a separate app.",
    },
];

const workflowSteps = [
    {
        number: "01",
        icon: "✎",
        title: "Create Your Dream",
        description:
            "Define your account ID, motto, and motivational link before the garment is assigned.",
    },
    {
        number: "02",
        icon: "□",
        title: "Design Your Piece",
        description:
            "Choose fabric, color, and functional details. Every component has purpose.",
    },
    {
        number: "03",
        icon: "◇",
        title: "Wear It Daily",
        description:
            "The garment becomes your uniform. High-grade materials support everyday performance.",
    },
    {
        number: "04",
        icon: "▥",
        title: "Tap To Remember",
        description:
            "Scan the patch to view your account, motto, and chosen reminder URL.",
    },
];

const inventoryItems = [
    ["Movementweave Tee", "Heavyweight 230GSM cotton", "$65.00"],
    ["Nomad Heavy Hoodie", "Brushed fleece lining", "$90.00"],
    ["Adventure Jacket", "Nano-resistant waterproof shell", "$145.00"],
    ["Performance Short", "4-way stretch nylon", "$55.00"],
];

function TechnicalCard({ title, detail, price, delay = 0 }) {
    return (
        <RevealOnScroll
            as="article"
            delay={delay}
            direction="scale"
            className="overflow-hidden rounded-[6px] border border-white/10 bg-[#17191a] shadow-[0_24px_60px_rgba(0,0,0,0.34)]"
        >
            <div
                className="h-52 bg-cover bg-center"
                style={{ backgroundImage: "url('/generated/fabric-card.png')" }}
            />
            <div className="flex min-h-20 items-end justify-between gap-4 border-t border-white/10 px-4 py-4">
                <div>
                    <h3 className="text-[11px] font-black uppercase leading-4 tracking-[-0.01em] text-white">
                        {title}
                    </h3>
                    <p className="mt-2 text-[11px] leading-4 text-white/55">{detail}</p>
                </div>
                <div className="shrink-0 text-[11px] font-black text-white">{price}</div>
            </div>
        </RevealOnScroll>
    );
}

export default function HomePage() {
    return (
        <div className="ik-dark-page min-h-screen bg-[#080909] text-white">
            <section className="relative min-h-[680px] overflow-hidden border-b border-white/10 md:min-h-[760px]">
                <div
                    className="absolute inset-0 bg-cover bg-[72%_center] opacity-80 md:bg-center"
                    style={{ backgroundImage: "url('/generated/hero-garment.png')" }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_64%_28%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(90deg,rgba(8,9,9,0.96)_0%,rgba(8,9,9,0.78)_34%,rgba(8,9,9,0.15)_72%,rgba(8,9,9,0.68)_100%)]" />

                <div className="relative mx-auto flex min-h-[680px] w-full max-w-7xl flex-col px-6 pb-16 pt-28 md:min-h-[760px] md:px-10 md:pt-32">
                    <div className="max-w-xl">
                        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff9a76]">
                            M.E.C. Series
                        </div>
                        <h1 className="mt-6 text-5xl font-black uppercase leading-[0.96] tracking-[-0.04em] md:text-7xl">
                            Designed.
                            <br />
                            For More.
                        </h1>
                        <p className="mt-7 max-w-md text-sm font-medium leading-7 text-white/78">
                            Create a custom account to design, carry, and remember every stitch. Our apparel is engineered as a physical extension for your highest performance.
                        </p>
                        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                            <Link
                                href="/userProfile/motto"
                                className="inline-flex h-12 items-center justify-center rounded-[4px] bg-white px-8 text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76]"
                            >
                                Create a Dream Account
                            </Link>
                            <Link
                                href="#inventory"
                                className="inline-flex h-12 items-center justify-center rounded-[4px] border border-white/50 px-8 text-[11px] font-black uppercase text-white transition hover:border-[#ff9a76] hover:text-[#ff9a76]"
                            >
                                View Collection
                            </Link>
                        </div>
                    </div>

                    <div className="mt-auto hidden justify-end md:flex">
                        <div className="border-r-2 border-[#ff9a76] pr-5 text-right">
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                                System Detail
                            </div>
                            <div className="mt-1 text-sm font-black uppercase tracking-[0.08em]">
                                Active Perform / DP-09
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <RevealOnScroll
                as="section"
                id="system"
                direction="up"
                className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_32%),#111314]"
            >
                <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-[1fr_1px_1fr] md:px-10">
                    <div className="max-w-lg">
                        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff9a76]">
                            Account System
                        </div>
                        <h2 className="mt-5 text-4xl font-black uppercase leading-[0.98] tracking-[-0.04em] md:text-5xl">
                            The Dream
                            <br />
                            Account.
                        </h2>
                        <p className="mt-6 text-sm font-medium leading-7 text-white/72">
                            Every IKIKAE garment is made to be a dream-engineered performance object. Built to become a personal signature, the Dream Account gives complete control over design, customization, and MEC-enabled functions.
                        </p>
                        <div className="mt-9 space-y-5 text-[12px] font-black uppercase text-white">
                            <div className="flex gap-4"><span className="text-[#ff9a76]">⌘</span> Custom motto embroidery</div>
                            <div className="flex gap-4"><span className="text-[#ff9a76]">⌘</span> MEC smart patch options</div>
                            <div className="flex gap-4"><span className="text-[#ff9a76]">✣</span> Accountability and timeline mapping</div>
                        </div>
                    </div>

                    <div className="hidden bg-white/15 md:block" />

                    <div className="flex items-center">
                        <div className="w-full rounded-[10px] border border-white/10 bg-white/[0.10] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur">
                            <div className="flex items-start justify-between gap-6 border-b border-white/14 pb-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/62">
                                        Account ID
                                    </div>
                                    <div className="mt-2 text-lg font-black uppercase">#RESA47522</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/62">
                                        Status
                                    </div>
                                    <div className="mt-2 text-sm font-black uppercase text-[#ff9a76]">
                                        Synchronized
                                    </div>
                                </div>
                            </div>
                            <div className="border-b border-white/14 py-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/62">
                                    Motto
                                </div>
                                <div className="mt-3 text-2xl font-black">“Stay in it.”</div>
                                <div className="mt-6 text-[10px] font-black uppercase tracking-[0.12em] text-white/62">
                                    System
                                </div>
                                <div className="mt-2 text-sm text-white/78">mec-performance/core_prime_v3</div>
                            </div>
                            <div className="flex items-end justify-between pt-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/62">
                                        Current Streak
                                    </div>
                                    <div className="mt-3 flex items-end gap-2">
                                        <span className="text-4xl font-light leading-none">07</span>
                                        <span className="pb-1 text-[11px] font-black uppercase">days</span>
                                    </div>
                                </div>
                                <Link
                                    href="/userProfile"
                                    aria-label="Open account"
                                    className="grid h-14 w-14 place-items-center rounded-full border border-[#ff9a76] text-xl text-[#ff9a76] transition hover:bg-[#ff9a76] hover:text-black"
                                >
                                    ▦
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </RevealOnScroll>

            <section className="border-b border-white/10 bg-[#070808]">
                <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
                    <RevealOnScroll className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff9a76]">
                        Engineered
                        <br />
                        For Performance
                    </RevealOnScroll>
                    <div className="mt-10 grid gap-8 md:grid-cols-3">
                        {systemDetails.map((detail, index) => (
                            <RevealOnScroll
                                as="article"
                                key={detail.number}
                                delay={index * 110}
                                className="border-white/16 md:border-r md:pr-10 md:last:border-r-0"
                            >
                                <div className="flex items-start gap-7">
                                    <div className="text-3xl font-black text-[#ff9a76]">{detail.number}</div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase leading-6">{detail.title}</h3>
                                        <p className="mt-7 text-sm font-medium leading-7 text-white/66">{detail.description}</p>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            <section id="workflow" className="bg-[#f5f5f3] text-black">
                <div className="mx-auto grid max-w-7xl gap-0 px-6 py-16 md:grid-cols-4 md:px-10">
                    {workflowSteps.map((step, index) => (
                        <RevealOnScroll
                            as="article"
                            key={step.number}
                            delay={index * 90}
                            direction="up"
                            className="border-black/12 py-8 md:border-r md:px-10 md:first:pl-0 md:last:border-r-0"
                        >
                            <div className="text-5xl font-black text-black/12">{step.number}</div>
                            <div className="mt-8 text-3xl leading-none text-black/80">{step.icon}</div>
                            <h3 className="mt-9 text-sm font-black uppercase">{step.title}</h3>
                            <p className="mt-5 max-w-[15rem] text-sm leading-6 text-black/52">{step.description}</p>
                        </RevealOnScroll>
                    ))}
                </div>
            </section>

            <section id="inventory" className="bg-[radial-gradient(circle_at_24%_12%,rgba(255,255,255,0.10),transparent_26%),#0a0c0d]">
                <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
                    <RevealOnScroll className="flex items-center justify-between gap-6">
                        <h2 className="text-3xl font-black uppercase tracking-[-0.03em]">Technical Inventory</h2>
                        <div className="hidden items-center gap-4 text-[11px] font-black uppercase md:flex">
                            <span>View All / 24</span>
                            <span className="text-[#ff9a76]">‹</span>
                            <span className="text-[#ff9a76]">›</span>
                        </div>
                    </RevealOnScroll>
                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {inventoryItems.map(([title, detail, price], index) => (
                            <TechnicalCard key={title} title={title} detail={detail} price={price} delay={index * 90} />
                        ))}
                    </div>
                    <div className="mt-8 flex justify-center gap-4 text-[#ff9a76]">
                        <span>←</span>
                        <span className="text-white/70">•</span>
                        <span className="text-white/30">•</span>
                        <span className="text-white/30">•</span>
                        <span>→</span>
                    </div>
                </div>
            </section>

            <RevealOnScroll
                as="section"
                direction="scale"
                className="border-y border-white/14 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.12),transparent_30%),#1a1c1d] px-6 py-16 text-center"
            >
                <div className="mx-auto max-w-2xl">
                    <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff9a76]">
                        Built a Physical
                        <br />
                        Extension.
                    </div>
                    <h2 className="mt-6 text-3xl font-black uppercase leading-tight tracking-[-0.03em] md:text-4xl">
                        Our mentality is a practice,
                        <br />
                        not an event.
                    </h2>
                    <Link
                        href="/userProfile/motto"
                        className="mt-9 inline-flex h-12 min-w-72 items-center justify-center rounded-[4px] bg-white px-8 text-[11px] font-black uppercase text-black transition hover:bg-[#ff9a76]"
                    >
                        Start With Your Dream
                    </Link>
                </div>
            </RevealOnScroll>

            <footer className="bg-[#050606]">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
                    <div className="text-xl font-black uppercase tracking-[-0.06em]">IKIKAE</div>
                    <div className="flex flex-wrap gap-8 text-[11px] font-black uppercase text-white/70">
                        <Link href="/about">Privacy</Link>
                        <Link href="/about">Terms</Link>
                        <Link href="/contact-us">Shipping</Link>
                        <Link href="/contact-us">Contact</Link>
                    </div>
                    <div className="text-[11px] font-black uppercase text-white/70">
                        © 2026 IKIKAE. Engineered for accountability.
                    </div>
                </div>
            </footer>
        </div>
    );
}
