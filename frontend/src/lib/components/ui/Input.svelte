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
    <label for={id || undefined} class="block text-sm font-semibold text-slate-700 mb-1.5">
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
    class="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm
      placeholder:text-slate-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors outline-none"
  />
</div>
