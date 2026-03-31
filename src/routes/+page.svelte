<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { DogPose } from '$lib/Components/Dog.svelte';
	import { turns } from '$lib/script.js';
	import PreScreen from '$lib/Components/PreScreen.svelte';
	import ChatPanel from '$lib/Components/ChatPanel.svelte';
	import WatchdogDog from '$lib/Components/WatchdogDog.svelte';

	// --- Condition ---
	// 1 = control (no dog)
	// 2 = informed screen
	// 3 = informed screen + textarea
	// 4 = dog (dismissible)
	// 5 = enforced dog (must answer before continuing)
	const condition = parseInt(page.url.searchParams.get('c') ?? '1') as 1 | 2 | 3 | 4 | 5;
	const showDog = condition === 4 || condition === 5;
	const enforced = condition === 5;
	const informed = condition === 2 || condition === 3;

	// --- Types ---
	type Role = 'ai' | 'user';

	interface TextMsg {
		role: Role;
		kind: 'text';
		text: string;
		hidden?: boolean;
	}
	interface ChoiceMsg {
		role: 'ai';
		kind: 'choice';
		text: string;
		options: { label: string; description?: string; biased: boolean }[];
	}
	type Msg = TextMsg | ChoiceMsg;

	interface LogEntry {
		user: string;
		asst: string;
		pattern: string;
		watchdog: { detect: boolean; pattern: string | null; nudge: string | null } | null;
		choice: string | null;
		flag: boolean;
	}

	// --- Config ---
	const TASK =
		'Plan a one-week trip to Paris. Try to explore places to visit, which hotel to stay in, how to travel, and what foods you should try.';
	const TOTAL_STEPS = turns.length;

	// --- Pre-screen ---
	let preScreenDone = $state(!informed);
	let preScreenReflection = $state('');

	// --- Chat state ---
	let msgs = $state<Msg[]>([]);
	let currentMsg = $state('');
	let currentStep = $state(0);
	let progress = $state(0);
	let generating = $state(false);
	let inputDisabled = $state(false);
	let flagged = $state<Set<number>>(new Set());
	let choiceMade = $state<Set<number>>(new Set());
	let choiceSelected = $state<Map<number, string>>(new Map()); // msgIndex → label

	// --- Dog state ---
	let dogVisible = $state(false);
	let dogMessage = $state('');
	let dogPose = $state<DogPose>('idle');
	let dogLocked = $state(false);

	// --- Log ---
	let sessionLog = $state<LogEntry[]>([]);
	let pendingEntry = $state<Partial<LogEntry>>({});

	// --- Debug ---
	type DebugEntry = {
		step: number;
		pattern: string;
		detect: boolean;
		watchdogPattern: string | null;
		nudge: string | null;
	};
	let debugLog = $state<DebugEntry[]>([]);

	// --- DOM ---
	let messagesEl: HTMLElement;
	const bindEl = (el: HTMLElement) => {
		messagesEl = el;
	};

	// --- Storage ---
	const saveToStorage = () => {
		localStorage.setItem(
			'nudge-session',
			JSON.stringify({
				condition,
				pretext: preScreenReflection,
				opening: msgs[0]?.text ?? '',
				messages: sessionLog
			})
		);
	};

	// --- Helpers ---
	const scrollBottom = () =>
		setTimeout(
			() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }),
			50
		);

	const typeText = async (text: string, target: TextMsg | ChoiceMsg) => {
		for (let i = 0; i <= text.length; i++) {
			target.text = text.slice(0, i);
			msgs = [...msgs];
			scrollBottom();
			await new Promise((r) => setTimeout(r, 12));
		}
	};

	const buildHistory = () =>
		msgs
			.filter((m) => m.text.trim())
			.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

	const fetchAiResponse = async (ctx: string) => {
		const res = await fetch('/textgen', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: buildHistory(), ctx })
		});
		return ((await res.json()).response ?? '') as string;
	};

	const fetchWatchdog = async (userMessage: string, aiMessage: string, priorChoice: string | null = null) => {
		const res = await fetch('/watchdog', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userMessage, aiMessage, priorChoice })
		});
		return res.json() as Promise<{ detect: boolean; pattern: string | null; nudge: string | null }>;
	};

	// --- AI turn ---
	const pushAiTurn = async (stepIndex: number, userText = '') => {
		const turn = turns[stepIndex];
		generating = true;
		await new Promise((r) => setTimeout(r, 400));

		const placeholder: Msg = turn.options
			? { role: 'ai', kind: 'choice', text: '', options: turn.options }
			: { role: 'ai', kind: 'text', text: '' };
		msgs = [...msgs, placeholder];

		const rawText = await fetchAiResponse(turn.ctx);

		// Parse dynamic choices from JSON block if present; always strip from display
		let aiText = rawText;
		const jsonMatch = rawText.match(/```json\s*(\{[\s\S]*?\})\s*```|\{"options":\s*\[[\s\S]*?\]\}/);
		if (jsonMatch) {
			const jsonStr = jsonMatch[1] ?? jsonMatch[0];
			aiText = rawText.slice(0, jsonMatch.index).trimEnd();
			if (!turn.options) {
				try {
					const parsed = JSON.parse(jsonStr) as {
						options: { label: string; description?: string }[];
					};
					const dynOptions = parsed.options.map((o) => ({ ...o, biased: false }));
					const last = msgs[msgs.length - 1] as ChoiceMsg;
					last.kind = 'choice';
					(last as any).options = dynOptions;
					msgs = [...msgs];
				} catch {
					/* ignore parse errors */
				}
			}
		}

		const result = await fetchWatchdog(userText, aiText, pendingEntry.choice ?? null);
		await typeText(aiText, msgs[msgs.length - 1] as TextMsg | ChoiceMsg);

		generating = false;

		pendingEntry = {
			user: userText,
			asst: aiText,
			pattern: turn.pattern,
			watchdog: result,
			choice: null,
			flag: false
		};

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

		if (showDog && result.detect) {
			setTimeout(() => {
				dogMessage = result.nudge ?? turn.probe;
				dogVisible = true;
				dogPose = 'talk';
				if (enforced) dogLocked = true;
			}, 500);
		} else {
			commitEntry();
		}
	};

	const commitEntry = (choiceLabel: string | null = null) => {
		sessionLog = [
			...sessionLog,
			{
				user: pendingEntry.user ?? '',
				asst: pendingEntry.asst ?? '',
				pattern: pendingEntry.pattern ?? '',
				watchdog: pendingEntry.watchdog ?? null,
				choice: choiceLabel ?? pendingEntry.choice ?? null,
				flag: pendingEntry.flag ?? false
			}
		];
		pendingEntry = {};
		saveToStorage();
	};

	// --- Flag ---
	const toggleFlag = (msgIndex: number) => {
		const next = new Set(flagged);
		next.has(msgIndex) ? next.delete(msgIndex) : next.add(msgIndex);
		flagged = next;
		pendingEntry = { ...pendingEntry, flag: next.has(msgIndex) };
	};

	// --- Advance ---
	const advanceTurn = async (userText: string, choiceLabel: string | null = null) => {
		if (choiceLabel !== null && pendingEntry.asst)
			pendingEntry = { ...pendingEntry, choice: choiceLabel };
		dogVisible = false;
		dogPose = 'idle';
		dogLocked = false;
		currentStep += 1;
		progress = Math.round((currentStep / TOTAL_STEPS) * 100);
		if (currentStep < turns.length) await pushAiTurn(currentStep, userText);
	};

	const sendMsg = async () => {
		if (!currentMsg.trim() || inputDisabled || generating || dogLocked) return;
		const text = currentMsg.trim();
		currentMsg = '';
		if (pendingEntry.asst) commitEntry();
		msgs = [...msgs, { role: 'user', kind: 'text', text }];
		scrollBottom();
		if (currentStep >= TOTAL_STEPS) {
			inputDisabled = true;
			dogPose = 'sleep';
			return;
		}
		await advanceTurn(text);
	};

	const chooseOption = (
		option: { label: string; image?: string; biased: boolean },
		msgIndex: number
	) => {
		if (choiceMade.has(msgIndex) || generating || dogLocked) return;
		choiceMade = new Set([...choiceMade, msgIndex]);
		choiceSelected = new Map([...choiceSelected, [msgIndex, option.label]]);
		pendingEntry = { ...pendingEntry, choice: option.label };
		// Inject into history for LLM context but not rendered as a chat bubble
		msgs = [
			...msgs,
			{ role: 'user', kind: 'text', text: `I'll go with: ${option.label}`, hidden: true }
		];
	};

	const onDogDismiss = () => {
		dogVisible = false;
		dogPose = 'idle';
		commitEntry();
	};
	const onDogAnswer = (answer: string) => {
		dogLocked = false;
		dogVisible = false;
		dogPose = 'idle';
		pendingEntry = { ...pendingEntry, flag: pendingEntry.flag ?? false };
		commitEntry();
	};

	onMount(async () => {
		if (!informed) await pushAiTurn(0);
	});
</script>

{#if !preScreenDone}
	<PreScreen
		withTextarea={condition === 3}
		onContinue={async (reflection) => {
			preScreenReflection = reflection;
			preScreenDone = true;
			await pushAiTurn(0);
		}}
	/>
{:else}
	<ChatPanel
		task={TASK}
		{progress}
		msgs={msgs.filter((m) => !('hidden' in m && m.hidden))}
		{generating}
		{dogLocked}
		{inputDisabled}
		{flagged}
		{choiceMade}
		{choiceSelected}
		{currentMsg}
		onSend={sendMsg}
		onChoose={chooseOption}
		onFlag={toggleFlag}
		onMsgInput={(v) => (currentMsg = v)}
		{bindEl}
	/>

	{#if showDog}
		<WatchdogDog
			visible={dogVisible}
			message={dogMessage}
			pose={dogPose}
			{enforced}
			onDismiss={onDogDismiss}
			onAnswer={onDogAnswer}
		/>
	{/if}

	<!-- Debug log -->
	<div class="fixed left-3 top-3 flex flex-col gap-1 font-mono text-[10px]">
		<div class="text-neutral-400">c={condition} step {currentStep}/{TOTAL_STEPS}</div>
		{#each debugLog as entry}
			<div class="rounded bg-black/70 px-2 py-1 text-white backdrop-blur">
				<span class="text-neutral-400">#{entry.step}</span>
				<span class="ml-1 text-yellow-300">{entry.pattern}</span>
				<span class="ml-1 {entry.detect ? 'text-red-400' : 'text-green-400'}"
					>{entry.detect ? '⚑' : '✓'}</span
				>
				{#if entry.watchdogPattern}<span class="ml-1 text-purple-300">{entry.watchdogPattern}</span
					>{/if}
			</div>
		{/each}
	</div>
{/if}
