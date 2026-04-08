<script lang="ts">
  import Thumbnail from './Thumbnail.svelte';
  import { pdf } from '$lib/stores/pdf.svelte';
</script>

<div class="thumb-list">
  {#each Array.from({ length: pdf.numPages }, (_, i) => i + 1) as n (n)}
    <Thumbnail pageNumber={n} />
  {/each}
</div>

<style>
  .thumb-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px;
  }
</style>
