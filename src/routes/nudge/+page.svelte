<script lang="ts">
	import { onMount } from 'svelte';
	import Dog from '$lib/Components/Dog.svelte';
	import type { DogPose } from '$lib/Components/Dog.svelte';
	import { turns } from '$lib/script.js';
	import Loader from '$lib/Components/loader.svelte';

	// --- Types ---
	type Role = 'ai' | 'user';

	interface TextMsg {
		role: Role;
		kind: 'text';
		text: string;
	}

	interface ChoiceMsg {
		role: 'ai';
		kind: 'choice';
		text: string;
		options: { label: string; description?: string; biased: boolean }[];
	}

	type Msg = TextMsg | ChoiceMsg;

	// --- Config ---
	const TASK =
		'Plan a one-week trip to Paris. Explore places to visit, where to stay, and what foods to try.';
	const TOTAL_STEPS = turns.length;

	// --- State ---
	let msgs: Msg[] = $state([]);
	let currentMsg = $state('');
	let currentStep = $state(0);
	let progress = $state(0);
	let waiting = $state(false);
	let inputDisabled = $state(false);

	// Dog nudge state
	let dogVisible = $state(false);
	let dogMessage = $state('');
	let dogPose = $state<DogPose>('idle');

	// Debug
	type DebugEntry = {
		step: number;
		pattern: string;
		detect: boolean;
		watchdogPattern: string | null;
		nudge: string | null;
	};
	let debugLog = $state<DebugEntry[]>([]);

	let messagesEl: HTMLElement;

	// --- Helpers ---
	const scrollBottom = () => {
		setTimeout(
			() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }),
			50
		);
	};

	const typeText = async (text: string, targetMsg: TextMsg | ChoiceMsg) => {
		for (let i = 0; i <= text.length; i++) {
			targetMsg.text = text.slice(0, i);
			msgs = [...msgs];
			scrollBottom();
			await new Promise((r) => setTimeout(r, 12));
		}
	};

	// Build the message history for the textgen API (excludes the empty placeholder at the end)
	const buildHistory = () =>
		msgs
			.filter((m) => m.text.trim())
			.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

	// Call textgen, get AI response text
	const fetchAiResponse = async (ctx: string): Promise<string> => {
		const res = await fetch('/textgen', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: buildHistory(), ctx })
		});
		const data = await res.json();
		return data.response ?? '';
	};

	// Call watchdog, get detection result
	const fetchWatchdog = async (userMessage: string, aiMessage: string) => {
		const res = await fetch('/watchdog', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userMessage, aiMessage })
		});
		return res.json() as Promise<{ detect: boolean; pattern: string | null; nudge: string | null }>;
	};

	// Push an AI turn: call API, type out response, then run watchdog
	const pushAiTurn = async (stepIndex: number, userText = '') => {
		const turn = turns[stepIndex];
		waiting = true;
		await new Promise((r) => setTimeout(r, 400));

		// For brand_bias turns, build the AI text then append options
		const isChoice = turn.pattern === 'brand_bias' && turn.options;

		const placeholder: Msg = isChoice
			? { role: 'ai', kind: 'choice', text: '', options: turn.options! }
			: { role: 'ai', kind: 'text', text: '' };

		msgs = [...msgs, placeholder];
		waiting = false;

		const aiText = await fetchAiResponse(turn.ctx);

		// Run watchdog after response is complete
		const result = await fetchWatchdog(userText, aiText);

		await typeText(aiText, msgs[msgs.length - 1] as TextMsg | ChoiceMsg);

		debugLog = [
			...debugLog,
			{
				step: stepIndex,
				pattern: turn.pattern,
				detect: result.detect,
				watchdogPattern: result.pattern,
				nudge: result.nudge
			}
		];

		if (result.detect && result.nudge) {
			setTimeout(() => {
				dogMessage = result.nudge!;
				dogVisible = true;
				dogPose = 'talk';
			}, 400);
		}
	};

	// --- Actions ---
	const advanceTurn = async (userText: string) => {
		msgs = [...msgs, { role: 'user', kind: 'text', text: userText }];
		scrollBottom();
		dogVisible = false;
		dogPose = 'idle';

		currentStep += 1;
		progress = Math.round((currentStep / TOTAL_STEPS) * 100);

		if (currentStep < turns.length) {
			await pushAiTurn(currentStep, userText);
		}

		if (currentStep >= TOTAL_STEPS) {
			inputDisabled = true;
			dogPose = 'sleep';
		}
	};

	const sendMsg = async () => {
		if (!currentMsg.trim() || inputDisabled) return;
		const text = currentMsg.trim();
		currentMsg = '';
		await advanceTurn(text);
	};

	const chooseOption = async (label: string) => {
		await advanceTurn(label);
	};

	onMount(async () => {
		await pushAiTurn(0);
	});
</script>

<div class="flex h-[100svh] w-screen flex-col items-center bg-white font-sans">
	<!-- Header -->
	<header class="w-full max-w-2xl px-4 pb-2 pt-8 text-center">
		<h1 class="text-2xl font-bold tracking-tight">
			Astra AI <span class="text-purple-500">✦</span>
		</h1>
	</header>

	<!-- Main layout: centered column, dog fixed bottom-right -->
	<div class="flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 px-4 pb-4">
		<!-- Task card -->
		<div class="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
			<p class="text-sm text-neutral-700">{TASK}</p>
			<div class="mt-3">
				<div class="h-1.5 w-full rounded-full bg-neutral-200">
					<div
						class="h-1.5 rounded-full bg-purple-500 transition-all duration-500"
						style="width: {Math.min(progress, 100)}%"
					></div>
				</div>
				<p class="mt-1 text-xs text-neutral-400">Progress: {progress}%</p>
			</div>
		</div>

		<!-- Chat panel -->
		<div
			bind:this={messagesEl}
			class="flex flex-1 flex-col gap-5 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-6 py-5"
		>
			{#each msgs as msg, i}
				{#if msg.role === 'ai'}
					<div class="flex max-w-[65%] flex-col gap-2">
						<div class="flex items-start gap-3">
							<div
								class="rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-relaxed text-neutral-800"
							>
								{#if msg.text}
									{msg.text}
								{:else}
									<Loader />
								{/if}
							</div>
							<!-- Flag button -->
							<button
								class="mt-2 shrink-0 text-neutral-300 transition-colors hover:text-red-500"
								title="Flag message"
							>
								<!-- 🚩 -->
								<img class="size-3 opacity-50" src="/flag.svg" alt="" />
							</button>
						</div>
						{#if msg.kind === 'choice' && msg.text.length === (msgs[i] as ChoiceMsg).text.length}
							<div class="flex flex-col gap-2">
								{#each (msgs[i] as ChoiceMsg).options as option}
									<button
										onclick={() => chooseOption(option.label)}
										class="rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm transition-colors hover:bg-neutral-50"
									>
										<div class="font-medium text-neutral-800">{option.label}</div>
										{#if option.description}
											<div class="mt-0.5 text-xs text-neutral-400">{option.description}</div>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex justify-end">
						<div
							class="max-w-[60%] rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-relaxed text-neutral-700"
						>
							{msg.text}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Input bar -->
		<div
			class="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-3 shadow-sm"
		>
			<input
				bind:value={currentMsg}
				disabled={inputDisabled}
				placeholder={inputDisabled ? 'Task complete.' : 'Type here'}
				class="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none disabled:opacity-40"
				onkeypress={(e) => {
					if (e.key === 'Enter') sendMsg();
				}}
			/>
			<button
				aria-label="Send message"
				onclick={sendMsg}
				disabled={inputDisabled || !currentMsg.trim()}
				class="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white transition-colors hover:bg-purple-600 disabled:opacity-30"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-4"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Debug log: fixed top-left -->
	<div class="fixed left-3 top-3 flex flex-col gap-1 font-mono text-[10px]">
		<div class="text-neutral-400">step {currentStep}/{TOTAL_STEPS}</div>
		{#each debugLog as entry}
			<div class="rounded bg-black/70 px-2 py-1 text-white backdrop-blur">
				<span class="text-neutral-400">#{entry.step}</span>
				<span class="ml-1 text-yellow-300">{entry.pattern}</span>
				<span class="ml-1 {entry.detect ? 'text-red-400' : 'text-green-400'}"
					>{entry.detect ? '⚑ detected' : '✓ clean'}</span
				>
				{#if entry.watchdogPattern}
					<span class="ml-1 text-purple-300">→ {entry.watchdogPattern}</span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Dog: fixed bottom-right -->
	<div class="fixed bottom-6 right-6 flex flex-col items-center gap-2">
		<div
			class="transition-opacity duration-300 {dogVisible
				? 'opacity-100'
				: 'pointer-events-none opacity-0'}"
		>
			<div
				class="relative max-w-[160px] whitespace-pre-line rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-snug text-neutral-700 shadow-md"
			>
				{dogMessage}
				<!-- Tail -->
				<div
					class="absolute -bottom-2 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-neutral-200 bg-white"
				></div>
			</div>
		</div>
		<Dog pose={dogPose} size={96} />
	</div>
</div>
