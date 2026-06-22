<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    variant = "default",
    disabled = false,
    onclick,
    type = "button",
    children,
  }: {
    variant?: "default" | "primary" | "secondary" | "danger";
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    type?: "button" | "submit";
    children: Snippet;
  } = $props();

  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    default:
      "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100",
    primary: "bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800",
    secondary: "bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50 active:bg-cyan-100",
    danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  };
</script>

<button class="{base} {variants[variant] ?? variants.default}" {disabled} {type} {onclick}>
  {@render children()}
</button>
