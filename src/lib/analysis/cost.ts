import { env } from "../env";

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
};

/** Stima in dollari ai prezzi di listino configurati. È una stima, non una fattura. */
export function estimateCost(usage: TokenUsage): number {
  return (
    (usage.input_tokens / 1_000_000) * env.priceInput +
    (usage.output_tokens / 1_000_000) * env.priceOutput +
    (usage.cache_tokens / 1_000_000) * env.priceCacheRead
  );
}

export function formatCost(dollars: number): string {
  if (dollars <= 0) return "—";
  if (dollars < 0.01) return "meno di 0,01 $";
  return `${dollars.toFixed(2).replace(".", ",")} $`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  return `${(tokens / 1000).toFixed(1).replace(".", ",")}k`;
}
