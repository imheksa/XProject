import Link from "next/link";

const FEATURES = [
  {
    title: "Unfollow accounts that don't follow back",
    description: "Find everyone you follow who never followed you, and clear them out in one pass.",
  },
  {
    title: "Unfollow non-Premium accounts",
    description: "Filter out accounts without an X Premium (blue) checkmark from who you follow.",
  },
  {
    title: "Unfollow inactive accounts",
    description: "Spot accounts you follow that haven't posted in 90+ days and stop following them.",
  },
  {
    title: "Remove inactive followers",
    description: "Clean up your follower list by removing followers who've gone quiet for 90+ days.",
  },
];

const STEPS = [
  { step: "1", title: "Sign in with X", description: "Authorize read/write access via X's official OAuth 2.0 login." },
  { step: "2", title: "Scan your account", description: "We read your following/followers graph and bucket accounts into each category." },
  { step: "3", title: "Review the list", description: "See exactly which accounts are affected before anything happens." },
  { step: "4", title: "Confirm & clean up", description: "We work through the list gradually, respecting X's rate limits." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="font-semibold tracking-tight">X Bulk Unfollow</div>
        <a
          href="/api/auth/login"
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-900"
        >
          Sign in with X
        </a>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Clean up who you follow on X, safely
        </h1>
        <p className="max-w-xl text-lg text-neutral-400">
          Bulk-unfollow accounts that don&apos;t follow back, aren&apos;t Premium, or have gone inactive &mdash;
          and remove inactive followers &mdash; without risking your account on scripts or sketchy tools.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="/api/auth/login"
            className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-neutral-200"
          >
            Sign in with X to get started
          </a>
          <Link
            href="/demo"
            className="rounded-full border border-neutral-700 px-6 py-3 font-semibold hover:bg-neutral-900"
          >
            See a live demo
          </Link>
        </div>
        <p className="text-xs text-neutral-500">
          Nothing is changed until you review and confirm each action.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-16 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="font-semibold">{f.title}</div>
            <p className="mt-1 text-sm text-neutral-400">{f.description}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <h2 className="mb-6 text-center text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="mb-2 text-sm font-semibold text-neutral-500">Step {s.step}</div>
              <div className="font-semibold">{s.title}</div>
              <p className="mt-1 text-sm text-neutral-400">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
          <div className="mb-2 font-semibold text-neutral-200">Built to be careful with your account</div>
          <ul className="list-inside list-disc space-y-1">
            <li>Uses X&apos;s official OAuth 2.0 login &mdash; your password is never seen by this app.</li>
            <li>Access tokens are encrypted at rest and never exposed to your browser.</li>
            <li>Every bulk action requires an explicit review and confirmation step first.</li>
            <li>Actions run gradually in the background, pacing requests to respect X&apos;s API rate limits.</li>
          </ul>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 pb-16 text-center">
        <a
          href="/api/auth/login"
          className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-neutral-200"
        >
          Sign in with X
        </a>
        <p className="text-xs text-neutral-600">Not affiliated with X Corp.</p>
      </footer>
    </div>
  );
}
