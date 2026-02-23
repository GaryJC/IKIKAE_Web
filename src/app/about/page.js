import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-start">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
            About
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
            Ikikae is a reminder you can wear.
          </h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
            A motto is your smallest repeatable truth. We turn it into a unique
            ID and a shareable page, connected to a QR so it can follow you
            through the day.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/userProfile/motto"
              className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
            >
              Create Your Motto
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted"
            >
              Back Home
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted p-8">
          <div className="flex items-center gap-3">
            <Image src="/image/logo.svg" alt="Ikikae" width={30} height={30} />
            <div className="text-xs font-semibold tracking-[0.28em] uppercase">
              生き変え
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-background p-6">
            <div className="text-sm italic leading-7">
              “Decide once. Repeat daily.”
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Keep it short. Keep it sharp.
            </div>
          </div>
          <div className="mt-5 text-xs leading-5 text-muted-foreground">
            Black and white on purpose: no distraction, just the message.
          </div>
        </div>
      </div>
    </div>
  );
}

