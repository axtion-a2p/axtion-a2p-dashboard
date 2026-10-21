"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-requests the current page on an interval so numbers stay current without a manual reload. Renders nothing. */
export function AutoRefresh({ intervalSeconds }: { intervalSeconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [router, intervalSeconds]);

  return null;
}
