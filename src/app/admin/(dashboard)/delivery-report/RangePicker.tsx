"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const OPTIONS: { value: string; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" },
];

export function RangePicker({ current, from, to }: { current: string; from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function pushRange(range: string, nextFrom?: string, nextTo?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    if (range === "custom" && nextFrom && nextTo) {
      params.set("from", nextFrom);
      params.set("to", nextTo);
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => pushRange(opt.value, customFrom, customTo)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              current === opt.value ? "bg-white text-primary shadow-sm" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {current === "custom" && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1"
          />
          <span className="text-neutral-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1"
          />
          <button
            onClick={() => pushRange("custom", customFrom, customTo)}
            disabled={!customFrom || !customTo}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
