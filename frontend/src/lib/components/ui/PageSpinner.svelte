<script lang="ts">
  let { label = "Carregando..." }: { label?: string } = $props();
</script>

<!-- Spinner de página — padrão único para substituir os blocos inline copiados -->
<div class="flex items-center justify-center py-20">
  <div class="w-8 h-8 border-2 border-sand-200 border-t-ocean-500 rounded-full animate-spin"></div>
  <span class="ml-3 text-sm text-ink-faint">{label}</span>
</div>
