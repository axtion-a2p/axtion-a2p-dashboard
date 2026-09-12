import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Axtion A2P 10DLC Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Submit and monitor 10DLC brand and campaign approval status for your app.axtion.ai sub-account.
      </p>
      <div className="mt-6 flex gap-4">
        <Link href="/signup" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          Create a sub-account
        </Link>
        <Link href="/admin" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900">
          Admin
        </Link>
      </div>
    </main>
  );
}
