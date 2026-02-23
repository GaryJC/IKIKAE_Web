import Link from "next/link";

export default function ContactUsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="max-w-2xl">
        <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
          Contact
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          Let’s build your QR flow.
        </h1>
        <p className="mt-5 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
          Tell us what you want the garment, motto page, and scanning experience
          to do. We can refine copy, the onboarding flow, and admin tooling.
        </p>

        <div className="mt-8 rounded-3xl border border-border bg-background p-8">
          <div className="text-sm font-semibold">Email</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Add your preferred contact address here (or wire this to a form
            endpoint).
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
            >
              Back Home
            </Link>
            <Link
              href="/about"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

