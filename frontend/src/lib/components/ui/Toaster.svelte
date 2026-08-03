<script lang="ts">
  import { CheckCircle, Info, TriangleAlert, X } from "@lucide/svelte";
  import { toast, toasts, type ToastKind } from "$lib/stores/toast.store";

  const ICONS: Record<ToastKind, typeof CheckCircle> = {
    success: CheckCircle,
    error: TriangleAlert,
    info: Info,
  };

  const COLORS: Record<ToastKind, string> = {
    success: "text-leaf-600",
    error: "text-tomato-600",
    info: "text-ocean-600",
  };
</script>

<!-- Cartolina: fundo branco, contorno de tinta, sombra dura, entrada com pop -->
<div
  class="fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4"
  aria-live="polite"
>
  {#each $toasts as t (t.id)}
    {@const Icon = ICONS[t.kind]}
    <div
      class="flex items-center gap-3 rounded-xl border-2 border-ink bg-surface-raised px-4 py-3 shadow-lift animate-pop"
    >
      <Icon class={`w-6 h-6 shrink-0 ${COLORS[t.kind]}`} />
      <p class="flex-1 text-base font-semibold text-ink">{t.message}</p>
      <button
        onclick={() => toast.dismiss(t.id)}
        class="shrink-0 rounded-lg border-2 border-ink bg-surface-raised p-1 text-ink-faint shadow-soft
          hover:text-ink active:translate-y-[2px] active:shadow-none"
        aria-label="Fechar notificação"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  {/each}
</div>
