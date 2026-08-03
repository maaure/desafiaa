<script lang="ts">
  import { TriangleAlert } from "@lucide/svelte";

  let {
    open = false,
    title = "Tem certeza?",
    message = "",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    middleLabel = "",
    variant = "danger",
    onconfirm,
    oncancel,
    onmiddle,
  }: {
    open?: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Botão intermediário opcional (ex.: "Salvar e sair") — sem ele, diálogo fica com 2 botões */
    middleLabel?: string;
    variant?: "danger" | "default";
    onconfirm?: () => void;
    oncancel?: () => void;
    onmiddle?: () => void;
  } = $props();

  let dialogEl = $state<HTMLDialogElement | undefined>(undefined);
  let cancelBtn = $state<HTMLButtonElement | undefined>(undefined);

  // Abre/fecha o <dialog> conforme a prop `open` (showModal dá Escape + foco grátis).
  // Foco no "Cancelar" — padrão seguro para ações destrutivas.
  $effect(() => {
    const d = dialogEl;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      cancelBtn?.focus();
    }
    if (!open && d.open) d.close();
  });

  // Escape fecha o dialog nativamente — repassa para o chamador
  function handleCancel(e: Event) {
    e.preventDefault();
    oncancel?.();
  }

  // Clique no backdrop (o target é o próprio dialog, não o painel) = cancelar
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) oncancel?.();
  }
</script>

<dialog
  bind:this={dialogEl}
  oncancel={handleCancel}
  onclick={handleBackdropClick}
  class="m-auto w-full max-w-md bg-transparent backdrop:bg-black/50 open:animate-fade-in"
>
  <div class="bg-surface-raised rounded-2xl border-2 border-ink shadow-lift p-6 animate-pop">
    <div class="flex items-start gap-3 mb-4">
      {#if variant === "danger"}
        <span
          class="shrink-0 w-10 h-10 rounded-full bg-tomato-50 border-2 border-ink flex items-center justify-center"
        >
          <TriangleAlert class="w-5 h-5 text-danger" />
        </span>
      {/if}
      <div>
        <h2 class="font-display text-lg font-extrabold text-ink tracking-tight">{title}</h2>
        {#if message}
          <p class="text-sm text-ink-soft mt-1 leading-relaxed">{message}</p>
        {/if}
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 flex-wrap">
      {#if middleLabel}
        <button
          onclick={onmiddle}
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ink bg-ocean-50 text-sm font-semibold text-ocean-800
            shadow-soft hover:bg-ocean-100 active:translate-y-[2px] active:shadow-none transition-all"
        >
          {middleLabel}
        </button>
      {/if}
      <button
        bind:this={cancelBtn}
        onclick={oncancel}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ink bg-surface-raised text-sm font-semibold text-ink-soft
          shadow-soft hover:bg-sand-100 active:translate-y-[2px] active:shadow-none transition-all"
      >
        {cancelLabel}
      </button>
      <button
        onclick={onconfirm}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-ink text-sm font-semibold text-white
          shadow-soft active:translate-y-[2px] active:shadow-none transition-all
          {variant === 'danger'
          ? 'bg-danger hover:bg-tomato-700 active:bg-tomato-800'
          : 'bg-primary hover:bg-primary-hover active:bg-coral-800'}"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</dialog>
