<script lang="ts">
  import type { Snippet } from "svelte";
  import { Loader2 } from "@lucide/svelte";

  let {
    variant = "default",
    disabled = false,
    loading = false,
    onclick,
    type = "button",
    class: className = "",
    children,
  }: {
    variant?: "default" | "primary" | "secondary" | "danger";
    disabled?: boolean;
    loading?: boolean;
    onclick?: (e: MouseEvent) => void;
    type?: "button" | "submit";
    class?: string;
    children: Snippet;
  } = $props();

  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-base font-semibold border-2 border-ink transition-colors shadow-soft active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-soft";

  const variants: Record<string, string> = {
    default: "bg-surface-raised text-ink-soft hover:bg-sand-100 active:bg-sand-100",
    primary: "bg-primary text-white hover:bg-primary-hover active:bg-coral-800",
    secondary: "bg-ocean-50 text-ocean-800 hover:bg-ocean-100 active:bg-ocean-100",
    danger: "bg-danger text-white hover:bg-tomato-700 active:bg-tomato-800",
  };
</script>

<button
  class="{base} {variants[variant] ?? variants.default} {className}"
  disabled={disabled || loading}
  {type}
  {onclick}
>
  {#if loading}
    <Loader2 class="w-4 h-4 animate-spin" />
  {/if}
  {@render children()}
</button>
