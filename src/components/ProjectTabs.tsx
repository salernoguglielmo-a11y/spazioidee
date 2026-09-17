"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Panoramica" },
  { href: "/documenti", label: "Documenti" },
  { href: "/moduli", label: "Moduli" },
  { href: "/dialogo", label: "Dialogo" },
  { href: "/dossier", label: "Dossier" },
  { href: "/impostazioni", label: "Impostazioni" },
];

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/progetti/${projectId}`;

  return (
    <nav className="no-print flex flex-wrap gap-1 border-b pb-px">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            className="rounded-t-lg px-3 py-2 text-sm font-medium transition"
            style={{
              background: active ? "var(--panel)" : "transparent",
              color: active ? "var(--text)" : "var(--muted)",
              borderBottom: active ? "2px solid var(--text)" : "2px solid transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
