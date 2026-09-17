export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "lg" }) {
  const color =
    score === null
      ? "var(--muted)"
      : score >= 85
        ? "var(--ok)"
        : score >= 70
          ? "var(--good)"
          : score >= 50
            ? "var(--warn)"
            : "var(--bad)";
  const dimension = size === "lg" ? 84 : size === "sm" ? 40 : 56;
  const fontSize = size === "lg" ? 24 : size === "sm" ? 13 : 17;

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: dimension,
        height: dimension,
        fontSize,
        color,
        border: `3px solid ${color}`,
        background: "var(--panel)",
      }}
      title={score === null ? "Non ancora analizzato" : `Punteggio ${score}/100`}
    >
      {score ?? "—"}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    validata: { label: "Validata", color: "var(--ok)" },
    in_revisione: { label: "In revisione", color: "var(--warn)" },
    ai: { label: "Da validare", color: "var(--good)" },
    assente: { label: "Non analizzato", color: "var(--muted)" },
  };
  const item = map[status] ?? map.assente!;
  return (
    <span className="badge" style={{ color: item.color, borderColor: item.color }}>
      {item.label}
    </span>
  );
}
