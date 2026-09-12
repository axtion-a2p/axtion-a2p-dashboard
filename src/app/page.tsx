import Link from "next/link";
import { BrandKicker } from "@/components/Brand";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <BrandKicker />
      <h1 className="text-2xl font-semibold text-neutral-900">A2P 10DLC Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Submit and monitor 10DLC brand and campaign approval status for your app.axtion.ai sub-account.
      </p>
      <div className="mt-6 flex gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Create a sub-account
        </Link>
        <Link href="/admin" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900">
          Admin
        </Link>
      </div>
    </main>
  );
}
