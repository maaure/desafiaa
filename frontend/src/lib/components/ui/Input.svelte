<script lang="ts">
  let {
    id = "",
    label = "",
    type = "text",
    value = "",
    placeholder = "",
    disabled = false,
    required = false,
    oninput,
    ...rest
  }: {
    id?: string;
    label?: string;
    type?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    oninput?: (e: Event) => void;
    [key: string]: unknown;
  } = $props();
</script>

<div class="mb-4">
  {#if label}
    <label for={id || undefined} class="block text-sm font-semibold text-ink-soft mb-1.5">
      {label}
    </label>
  {/if}
  <input
    {id}
    {type}
    {value}
    {placeholder}
    {disabled}
    {required}
    {oninput}
    {...rest}
    class="w-full px-4 py-3.5 rounded-xl border-2 border-ink bg-surface-raised shadow-soft text-base
      placeholder:text-ink-faint focus:border-ocean-500
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors outline-none"
  />
</div>
