<script lang="ts">
	import Loader from '$lib/Components/loader.svelte';
	import { pm, shoplift, drug } from '$lib/prompts-full';
	import { micromark } from 'micromark';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const t = page.url.searchParams.get('t') || '';
	const s = page.url.searchParams.get('s') || '';
	let msgs: TMsg[] = [];

	const sources = { pm, shoplift, drug }[s] ?? pm;
	const summaries = [sources.honest, sources.deceptive];

	let waiting = false;
	let animateFinish = false;

	let scrollToBottom = (_: string) => {};

	onMount(async () => {
		scrollToBottom = (obj: string) => {
			const node = document.getElementById(obj);
			const scroll = () => {
				if (node)
					node.scroll({
						top: node.scrollHeight,
						behavior: 'smooth'
					});
			};
			scroll();

			return { update: scroll };
		};

		const ctx = `Hi there! I'm a chatbot to summarize about ${sources.usr} Here's the summary of the news: ${summaries.at(parseInt(t) || 0)}

What do you think about the news?`;

		for (let i = 0; i < ctx.length; i++) {
			msgs = [{ type: 'ai', text: ctx.slice(0, i + 1) }];
			await new Promise((r) => setTimeout(r, 5));
			scrollToBottom('messages');
			if (i === ctx.length - 1) {
				animateFinish = true;
			}
		}
	});
</script>

<div class="flex h-[100svh] w-screen items-center justify-center">
	<main
		class="flex h-full w-[60rem] max-w-full flex-col justify-between gap-6 p-4 py-6 lg:aspect-video lg:h-auto lg:max-w-[80vw] lg:py-4"
	>
		<section id="messages" class="flex h-full flex-col gap-6 overflow-scroll">
			{#each msgs as msg, i}
				<div class="flex w-full gap-6" id={`msg-${i}`}>
					<div
						class={`size-[80px] min-w-[80px] overflow-hidden rounded-md ${msg.type === 'ai' ? 'border border-black' : ''}`}
					>
						<img
							src={msg.type === 'ai' ? 'ai.png' : 'user.png'}
							class="h-full w-full object-cover"
							alt=""
						/>
					</div>
					{#if !waiting || i < msgs.length - 1}
						<div
							class={`w-full text-pretty ${msg.type === 'ai' ? 'border-t' : 'border-t-2 font-semibold'} border-black pr-3 pt-3`}
						>
							<div class="prose">
								{@html micromark(msg.text)}
							</div>
						</div>
					{:else}
						<div class="h-full w-full border-t border-black pr-3"><Loader /></div>
					{/if}
				</div>
			{/each}
		</section>
	</main>
</div>
