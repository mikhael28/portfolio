"use client";

import { usePathname } from "next/navigation";

// Lets the server layout drop site-wide chrome (dock, animated background) on
// full-screen routes like the book reader, without making that chrome a client component.
export function HideOnRoute({ paths, children }: { paths: readonly string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const hidden = paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return hidden ? null : children;
}
