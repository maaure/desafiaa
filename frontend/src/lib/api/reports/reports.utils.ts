export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function accuracyColor(rate: number): string {
  if (rate >= 80) return "text-leaf-600";
  if (rate >= 50) return "text-mango-600";
  return "text-tomato-600";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR");
}

export function statusLabel(status: string): string {
  switch (status) {
    case "lobby":
      return "Aguardando";
    case "playing":
      return "Em andamento";
    case "finished":
      return "Finalizada";
    default:
      return status;
  }
}
