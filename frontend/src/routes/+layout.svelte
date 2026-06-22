<script lang="ts">
  let { children } = $props();
</script>

{#each [1] as _}
  {@render children()}
{/each}
