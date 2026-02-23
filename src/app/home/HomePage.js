import Image from "next/image";
import Link from "next/link";

function FeatureCard({ eyebrow, title, description, className = "" }) {
    return (
        <div className={`rounded-2xl border border-border bg-background p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1 ${className}`}>
            <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                {eyebrow}
            </div>
            <div className="mt-3 text-lg font-semibold tracking-[-0.01em]">
                {title}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
            </p>
        </div>
    );
}

export default function HomePage() {
    return (
        <div className="relative isolate w-full overflow-hidden">
            <div className="pointer-events-none absolute left-1/2 top-[-152px] -z-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-black/[0.07] md:hidden" />
            <div className="pointer-events-none absolute left-1/2 top-[-326px] -z-10 hidden h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-black/[0.08] blur-[18px] md:block" />

            <div className="mx-auto w-full max-w-6xl px-6">
                <section className="relative animate-fade-in pb-10 pt-14 md:pb-14 md:pt-20">

                    <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-2xl animate-rise-in">
                            <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                                生き変え / Ikikae
                            </div>
                            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-6xl">
                                Wear the sentence you refuse to forget.
                            </h1>
                            <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                                Dream. Change. Achieve. Capture a motto, claim an ID, and make it
                                shareable through your QR.
                            </p>

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link
                                    href="/userProfile/motto"
                                    className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
                                >
                                    Create Your Motto
                                </Link>
                                <Link
                                    href="/about"
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    Why Ikikae
                                </Link>
                            </div>
                        </div>

                        <div className="animate-rise-in animate-delay-1 rounded-3xl border border-border bg-muted p-8 md:w-[360px]">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground">
                                    Motto Sample
                                </div>
                                <Image src="/image/logo.svg" alt="Ikikae" width={26} height={26} />
                            </div>
                            <div className="mt-6 rounded-2xl bg-background p-6">
                                <div className="text-sm italic leading-7">
                                    “Move with intent. Keep your eyes on the work.”
                                </div>
                                <div className="mt-4 text-xs text-muted-foreground">
                                    ID: IKIKAE-019
                                </div>
                            </div>
                            <div className="mt-4 text-xs leading-5 text-muted-foreground">
                                Your profile can be opened from a QR code and shared as a link.
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-t border-border py-12">
                    <div className="grid gap-4 md:grid-cols-3">
                        <FeatureCard
                            className="animate-rise-in"
                            eyebrow="01"
                            title="Claim a unique ID"
                            description="Pick a handle that becomes your public anchor. One person, one motto."
                        />
                        <FeatureCard
                            className="animate-rise-in animate-delay-1"
                            eyebrow="02"
                            title="Control visibility"
                            description="Public or private, with a share link when you choose to publish."
                        />
                        <FeatureCard
                            className="animate-rise-in animate-delay-2"
                            eyebrow="03"
                            title="Connect it to QR"
                            description="Link the QR code to your profile so your motto shows up instantly."
                        />
                    </div>
                </section>

                <section className="animate-rise-in animate-delay-2 pb-16">
                    <div className="rounded-3xl border border-border bg-foreground px-8 py-10 text-background transition-transform duration-300 hover:-translate-y-0.5 md:px-12 md:py-12">
                        <div className="max-w-2xl">
                            <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-background/70">
                                The point
                            </div>
                            <div className="mt-4 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
                                Your clothes are a reminder system.
                            </div>
                            <p className="mt-4 text-sm leading-6 text-background/75 md:text-base md:leading-7">
                                A motto is small enough to repeat, sharp enough to steer decisions,
                                and personal enough to earn permanence.
                            </p>
                            <div className="mt-6">
                                <Link
                                    href="/contact-us"
                                    className="inline-flex h-11 items-center justify-center rounded-full bg-background px-6 text-sm font-medium text-foreground hover:bg-background/90"
                                >
                                    Contact
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
