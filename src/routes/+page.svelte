<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { DogPose } from '$lib/Components/Dog.svelte';
	import { turns } from '$lib/script.js';
	import { saveSession } from '$lib/firebase.js';
	import PreScreen from '$lib/Components/PreScreen.svelte';
	import ChatPanel from '$lib/Components/ChatPanel.svelte';
	import WatchdogDog from '$lib/Components/WatchdogDog.svelte';

	// ── Condition ──────────────────────────────────────────────────────────────
	// 1 = control (no dog)
	// 2 = informed screen
	// 3 = informed screen + textarea
	// 4 = dog (dismissible)
	// 5 = enforced dog (must answer before continuing)
	const condition = parseInt(page.url.searchParams.get('c') ?? '1') as 1 | 2 | 3 | 4 | 5;
	const showDog = condition === 4 || condition === 5;
	const enforced = condition === 5;

	// ── Types ──────────────────────────────────────────────────────────────────
	type Role = 'ai' | 'user';
	interface TextMsg { role: Role; kind: 'text'; text: string; hidden?: boolean; }
	interface ChoiceMsg {
		role: 'ai'; kind: 'choice'; text: string;
		options: { label: string; description?: string; biased: boolean }[];
	}
	type Msg = TextMsg | ChoiceMsg;

	interface LogEntry {
		user: string;
		asst: string;
		pattern: string;
		watchdog: { detect: boolean; pattern: string | null; nudge: string | null } | null;
		choice: string | null;
	}

	// ── Config ─────────────────────────────────────────────────────────────────
	const TASK = 'Task 1 of 2: Plan a one-week trip to Paris. Try to explore places to visit, how to travel around, which hotel to stay in, and what foods you should try.';

	// ── Pre-screen ─────────────────────────────────────────────────────────────
	let preScreenDone = $state(false);
	let preScreenReflection = $state('');
	let uid = $state('');

	// ── Chat ───────────────────────────────────────────────────────────────────
	let msgs = $state<Msg[]>([]);
	let currentMsg = $state('');
	let currentStep = $state(0);       // number of AI turns pushed so far
	let generating = $state(false);
	let flagged = $state<Set<number>>(new Set());
	let choiceMade = $state<Set<number>>(new Set());
	let choiceSelected = $state<Map<number, string>>(new Map());

	// ── Derived end state ──────────────────────────────────────────────────────
	const isDone = $derived(currentStep >= turns.length);
	const progress = $derived(Math.round((currentStep / turns.length) * 100));

	// ── Dog ────────────────────────────────────────────────────────────────────
	let dogVisible = $state(false);
	let dogMessage = $state('');
	let dogPose = $state<DogPose>('idle');
	let dogLocked = $state(false);

	// ── Log ────────────────────────────────────────────────────────────────────
	let sessionLog = $state<LogEntry[]>([]);
	let pendingEntry = $state<Partial<LogEntry>>({});

	// ── Debug ──────────────────────────────────────────────────────────────────
	type DebugEntry = { step: number; pattern: string; detect: boolean; watchdogPattern: string | null; nudge: string | null; };
	let debugLog = $state<DebugEntry[]>([]);

	// ── DOM ────────────────────────────────────────────────────────────────────
	let messagesEl: HTMLElement;
	const bindEl = (el: HTMLElement) => { messagesEl = el; };
	const scrollBottom = () => setTimeout(() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }), 50);

	// ── End state effect ───────────────────────────────────────────────────────
	$effect(() => {
		if (isDone) dogPose = 'sleep';
	});

	// ── Persistence ────────────────────────────────────────────────────────────
	const getSessionData = () => ({
		uid, condition,
		pretext: preScreenReflection,
		opening: msgs.find(m => m.role === 'ai')?.text ?? '',
		messages: sessionLog,
		flagged: [...flagged]
	});

	const save = () => {
		localStorage.setItem('nudge-session', JSON.stringify(getSessionData()));
	};

	// ── API ────────────────────────────────────────────────────────────────────
	const buildHistory = () =>
		msgs.filter(m => m.text.trim()).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

	const fetchAiResponse = async (ctx: string) => {
		const res = await fetch('/textgen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: buildHistory(), ctx }) });
		return ((await res.json()).response ?? '') as string;
	};

	const fetchWatchdog = async (userMessage: string, aiMessage: string, priorChoice: string | null = null) => {
		const res = await fetch('/watchdog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userMessage, aiMessage, priorChoice }) });
		return res.json() as Promise<{ detect: boolean; pattern: string | null; nudge: string | null }>;
	};

	// ── Type helper ────────────────────────────────────────────────────────────
	const typeText = async (text: string, target: TextMsg | ChoiceMsg) => {
		for (let i = 0; i <= text.length; i++) {
			target.text = text.slice(0, i);
			msgs = [...msgs];
			scrollBottom();
			await new Promise(r => setTimeout(r, 12));
		}
	};

	// ── Log ────────────────────────────────────────────────────────────────────
	const commitEntry = (choiceLabel: string | null = null) => {
		if (!pendingEntry.asst) return;
		sessionLog = [...sessionLog, {
			user: pendingEntry.user ?? '',
			asst: pendingEntry.asst,
			pattern: pendingEntry.pattern ?? '',
			watchdog: pendingEntry.watchdog ?? null,
			choice: choiceLabel ?? pendingEntry.choice ?? null
		}];
		pendingEntry = {};
		save();
	};

	// ── AI turn ─────────────────────────────────────────────────────────────────
	const pushAiTurn = async (stepIndex: number, userText = '') => {
		const turn = turns[stepIndex];
		generating = true;
		await new Promise(r => setTimeout(r, 400));

		// Push placeholder
		const placeholder: Msg = turn.options
			? { role: 'ai', kind: 'choice', text: '', options: turn.options }
			: { role: 'ai', kind: 'text', text: '' };
		msgs = [...msgs, placeholder];

		// Fetch AI response
		const rawText = await fetchAiResponse(turn.ctx);

		// Strip/parse JSON choices block
		let aiText = rawText;
		const jsonMatch = rawText.match(/```json\s*(\{[\s\S]*?\})\s*```|\{"options":\s*\[[\s\S]*?\]\}/);
		if (jsonMatch) {
			const jsonStr = jsonMatch[1] ?? jsonMatch[0];
			aiText = rawText.slice(0, jsonMatch.index).trimEnd();
			if (!turn.options) {
				try {
					const parsed = JSON.parse(jsonStr) as { options: { label: string; description?: string }[] };
					const dynOptions = parsed.options.map(o => ({ ...o, biased: false }));
					const last = msgs[msgs.length - 1] as ChoiceMsg;
					last.kind = 'choice';
					(last as any).options = dynOptions;
					msgs = [...msgs];
				} catch { /* ignore */ }
			}
		}

		// Run watchdog in parallel with typeText
		const [result] = await Promise.all([
			fetchWatchdog(userText, aiText, pendingEntry.choice ?? null),
			typeText(aiText, msgs[msgs.length - 1] as TextMsg | ChoiceMsg)
		]);

		generating = false;
		currentStep = stepIndex + 1;

		// Set pending entry for this turn
		pendingEntry = { user: userText, asst: aiText, pattern: turn.pattern, watchdog: result, choice: null };

		debugLog = [...debugLog, { step: stepIndex, pattern: turn.pattern, detect: result.detect, watchdogPattern: result.pattern, nudge: result.nudge }];

		const hasChoiceButtons = msgs[msgs.length - 1].kind === 'choice';

		if (showDog && result.detect) {
			// Dog handles commit on dismiss/answer
			setTimeout(() => {
				dogMessage = result.nudge ?? turn.probe;
				dogVisible = true;
				dogPose = 'talk';
				if (enforced) dogLocked = true;
			}, 500);
		} else if (!hasChoiceButtons) {
			// No choices and no dog — commit immediately
			commitEntry();
		}
		// If hasChoiceButtons: commit deferred until user picks or sends next message
	};

	// ── User actions ───────────────────────────────────────────────────────────
	const sendMsg = async () => {
		if (!currentMsg.trim() || isDone || generating || dogLocked) return;
		const text = currentMsg.trim();
		currentMsg = '';

		// Commit any pending entry (captures choice if user made one)
		commitEntry();

		msgs = [...msgs, { role: 'user', kind: 'text', text }];
		scrollBottom();

		// Push next AI turn (currentStep is already the next index after last pushAiTurn)
		if (currentStep < turns.length) await pushAiTurn(currentStep, text);
	};

	const chooseOption = (option: { label: string; image?: string; biased: boolean }, msgIndex: number) => {
		if (choiceMade.has(msgIndex) || generating || dogLocked) return;
		choiceMade = new Set([...choiceMade, msgIndex]);
		choiceSelected = new Map([...choiceSelected, [msgIndex, option.label]]);
		pendingEntry = { ...pendingEntry, choice: option.label };
		msgs = [...msgs, { role: 'user', kind: 'text', text: `I'll go with: ${option.label}`, hidden: true }];
	};

	const toggleFlag = (msgIndex: number) => {
		const next = new Set(flagged);
		next.has(msgIndex) ? next.delete(msgIndex) : next.add(msgIndex);
		flagged = next;
		save();
	};

	const onDogDismiss = () => { dogVisible = false; dogPose = 'idle'; commitEntry(); };
	const onDogAnswer = (_answer: string) => { dogLocked = false; dogVisible = false; dogPose = 'idle'; commitEntry(); };

	const onNext = async () => {
		commitEntry(); // flush any remaining pending
		await saveSession(uid, getSessionData());
		window.location.href = `/survey?user_id=${uid}`;
	};

	onMount(async () => {
		if (!preScreenDone) return;
		await pushAiTurn(0);
	});
</script>

{#if !preScreenDone}
	<PreScreen
		{condition}
		onContinue={async (reflection) => {
			preScreenReflection = reflection;
			uid = crypto.randomUUID();
			preScreenDone = true;
			await pushAiTurn(0);
		}}
	/>
{:else}
	<ChatPanel
		task={TASK}
		{progress}
		msgs={msgs.filter(m => !('hidden' in m && m.hidden))}
		{generating}
		{dogLocked}
		inputDisabled={isDone}
		{flagged}
		{choiceMade}
		{choiceSelected}
		{currentMsg}
		onSend={sendMsg}
		onChoose={chooseOption}
		onFlag={toggleFlag}
		onMsgInput={(v) => (currentMsg = v)}
		{bindEl}
		{onNext}
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
		<div class="rounded bg-black/70 px-2 py-1 text-white backdrop-blur flex flex-col gap-0.5">
			<div><span class="text-neutral-400">c=</span>{condition} <span class="text-neutral-400">step=</span>{currentStep}/{turns.length}</div>
			<div><span class="text-neutral-400">isDone=</span><span class="{isDone ? 'text-green-400' : 'text-neutral-300'}">{isDone}</span> <span class="text-neutral-400">gen=</span><span class="{generating ? 'text-yellow-300' : 'text-neutral-300'}">{generating}</span></div>
			<div><span class="text-neutral-400">dogLocked=</span><span class="{dogLocked ? 'text-red-400' : 'text-neutral-300'}">{dogLocked}</span> <span class="text-neutral-400">dogVisible=</span><span class="{dogVisible ? 'text-yellow-300' : 'text-neutral-300'}">{dogVisible}</span></div>
			<div><span class="text-neutral-400">pending=</span>{pendingEntry.pattern ?? '—'} <span class="text-neutral-400">choice=</span>{pendingEntry.choice ?? '—'}</div>
			<div><span class="text-neutral-400">log=</span>{sessionLog.length} <span class="text-neutral-400">uid=</span>{uid.slice(0,8)}…</div>
		</div>
		{#each debugLog as entry}
			<div class="rounded bg-black/70 px-2 py-1 text-white backdrop-blur">
				<span class="text-neutral-400">#{entry.step}</span>
				<span class="ml-1 text-yellow-300">{entry.pattern}</span>
				<span class="ml-1 {entry.detect ? 'text-red-400' : 'text-green-400'}">{entry.detect ? '⚑' : '✓'}</span>
				{#if entry.watchdogPattern}<span class="ml-1 text-purple-300">{entry.watchdogPattern}</span>{/if}
			</div>
		{/each}
	</div>
{/if}
