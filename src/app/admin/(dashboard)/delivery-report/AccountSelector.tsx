"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function AccountSelector({
  accounts,
  selectedId,
}: {
  accounts: { id: string; businessName: string }[];
  selectedId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("account", id);
    else params.delete("account");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm"
    >
      <option value="">Select a sub-account…</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.businessName}
        </option>
      ))}
    </select>
  );
}
