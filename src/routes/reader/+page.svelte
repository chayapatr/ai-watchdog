<script>
	import { onMount } from 'svelte';
	import { micromark } from 'micromark';
	import { page } from '$app/state';
	let text = '';
	const s = page.url.searchParams.get('s') || 'pm';

	onMount(async () => {
		const raw = await fetch(`/articles/${s}.md`).then((x) => x.text());
		text = micromark(raw);
	});
</script>

<div class="flex w-screen items-center justify-center p-10">
	<div class="prose prose-p:font-serif">{@html text}</div>
</div>
