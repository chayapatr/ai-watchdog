<script lang="ts">
	import Loader from '$lib/Components/loader.svelte';
	import { pm, shoplift, drug } from '$lib/prompts-full';
	import { postData } from '$lib/sheet';
	import { micromark } from 'micromark';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const qid = page.url.searchParams.get('qid') || '';
	const t = page.url.searchParams.get('t') || '';
	const s = page.url.searchParams.get('s') || '';

	const sources = { pm, shoplift, drug }[s] ?? pm;

	// const stages = [stages0, stages1].at(parseInt(t) || 0) ?? stages0;
	const stages =
		[sources.honestStages, sources.deceptiveStages].at(parseInt(t) || 0) ?? sources.honestStages;
	const summaries = [sources.honest, sources.deceptive];

	let currentStage: number = 0;
	let currentTopicLength: number = 0;

	let currentMsg = '';
	let msgs: TMsg[] = [];

	let waiting = false;
	let post = false;
	let animateFinish = false;

	const textgen = async (
		msgs: TMsg[],
		type: string,
		ctx: string
	): Promise<{ response: string }> => {
		const text = await fetch('/textgen', {
			method: 'POST',
			body: JSON.stringify({
				prompt: JSON.stringify(msgs),
				type,
				ctx
			})
		}).then((x) => x.text());
		const parsed = JSON.parse(text);
		return parsed;
	};

	const addMsg = (msgs: TMsg[], msg: string, type: 'ai' | 'user') => {
		return [
			...msgs,
			{
				type,
				text: msg
			}
		];
	};

	let scrollToBottom = (_: string) => {};

	const sendchat = async () => {
		msgs = addMsg(msgs, currentMsg, 'user');
		currentMsg = '';

		setTimeout(() => {
			document.getElementById(`msg-${msgs.length - 1}`)?.scrollIntoView();
		}, 100);
		waiting = true;
		msgs = addMsg(msgs, '', 'ai');
		scrollToBottom('messages');

		let promptObj = {
			type: '',
			ctx: ''
		};

		if (stages[currentStage].type === 'information') {
			promptObj.type = 'information';
			if (currentTopicLength === 0) {
				promptObj.ctx = `Segway into discussing this information "${stages[currentStage].ctx}".
				The following bubble is the user chat`;
				if (Math.random() < 0.5) {
					currentStage += 1;
					currentTopicLength = 0;
				} else {
					currentTopicLength += 1;
				}
			} else {
				promptObj.ctx = `continue talking about "${stages[currentStage].ctx}"" without changing the topic. Don't repeat the topic if previously discussed and emphasize with the previous chats if possible`;
				currentStage += 1;
				currentTopicLength = 0;
			}
		} else {
			promptObj = {
				type: 'wrap',
				ctx: 'wrap up the conversation'
			};
			post = true;
		}

		animateFinish = false;
		const completion = (await textgen(msgs, promptObj.type, promptObj.ctx)) ?? '';
		const old = msgs.slice(0, -1);

		waiting = false;
		if (completion?.response) {
			const length = completion.response.length;
			for (let i = 0; i < length; i++) {
				msgs = [...old, { type: 'ai', text: completion?.response.slice(0, i + 1) ?? '' }];
				scrollToBottom('messages');
				await new Promise((r) => setTimeout(r, 5));
			}
			animateFinish = true;
		}

		if (post) {
			postData({
				exp_condition: parseInt(t) === 1 ? 'misleading chatbot' : 'honest chatbot',
				chat_log: JSON.stringify(msgs.slice(1)),
				timestamp: new Date().toISOString().toString(),
				qualtrics_code: qid
			});
		}
	};

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

		const ctx = `Hi there! I'm a chatbot to discuss about ${sources.usr} Here's the summary of the article:
		
${summaries[parseInt(t) || 0]}

What do you think about the article?`;

		for (let i = 0; i < ctx.length; i++) {
			msgs = [{ type: 'ai', text: ctx.slice(0, i + 1) }];
			await new Promise((r) => setTimeout(r, 5));

			// const obj = document.getElementById('messages');
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
		<section id="textbox" class="flex items-center gap-3">
			<div
				class="flex h-full w-full items-center border-b border-black disabled:border-neutral-500"
			>
				<textarea
					disabled={post || !animateFinish}
					style="resize:none;field-sizing: content;"
					class="max-h-12 w-full bg-transparent px-1 pb-2 focus:outline-none disabled:bg-transparent"
					name=""
					id=""
					placeholder={post
						? 'Enter the password "happy horse 2024" (without quatation marks) to Qualtrics to proceed'
						: 'What do you think?'}
					bind:value={currentMsg}
					onkeypress={(e) => {
						// if enter and not hold shift
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							sendchat();
						}
					}}
				></textarea>

			</div>
			<button
				disabled={post || !animateFinish}
				class="aspect-video h-12 bg-black px-4 text-white disabled:bg-neutral-500"
				onclick={sendchat}>Submit</button
			>
		</section>
	</main>
</div>
