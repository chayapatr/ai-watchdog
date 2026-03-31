<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { DogPose } from '$lib/Components/Dog.svelte';
	import { tasks } from '$lib/script.js';
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
		watchdog: { reasoning: string | null; detect: boolean; pattern: string | null; nudge: string | null } | null;
		choice: string | null;
	}

	// ── Pre-screen ─────────────────────────────────────────────────────────────
	let preScreenDone = $state(false);
	let preScreenReflection = $state('');
	let uid = $state('');

	// ── Task ───────────────────────────────────────────────────────────────────
	let currentTask = $state(0);  // 0 = task 1, 1 = task 2
	const activeTask = $derived(tasks[currentTask]);

	// ── Chat ───────────────────────────────────────────────────────────────────
	let msgs = $state<Msg[]>([]);
	let currentMsg = $state('');
	let currentStep = $state(0);       // number of AI turns pushed so far within active task
	let generating = $state(false);
	let choiceMade = $state<Set<number>>(new Set());
	let choiceSelected = $state<Map<number, string>>(new Map());

	// ── Derived end state ──────────────────────────────────────────────────────
	const isDone = $derived(currentStep >= activeTask.turns.length);
	const isLastTask = $derived(currentTask >= tasks.length - 1);
	const progress = $derived(Math.round((currentStep / activeTask.turns.length) * 100));

	// ── Dog ────────────────────────────────────────────────────────────────────
	let dogVisible = $state(false);
	let dogMessage = $state('');
	let dogPose = $state<DogPose>('idle');
	let dogLocked = $state(false);

	// ── Log ────────────────────────────────────────────────────────────────────
	let sessionLog = $state<(LogEntry & { task: number; flagged: boolean })[]>([]);
	let pendingEntry = $state<Partial<LogEntry>>({});

	// ── Flagged (derived from sessionLog for current task) ────────────────────
	// aiIndex in ChatPanel = position among AI msgs in display = sessionLog index within current task
	const flagged = $derived(
		new Set(
			sessionLog
				.filter(e => e.task === currentTask && e.flagged)
				.map(e => sessionLog.filter(x => x.task === currentTask).indexOf(e))
		)
	);

	// ── Debug ──────────────────────────────────────────────────────────────────
	type DebugEntry = { task: number; step: number; pattern: string; detect: boolean; watchdogPattern: string | null; nudge: string | null; };
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
	const getSessionData = () => {
		const taskGroups = tasks.map((t, i) => ({
			task: i + 1,
			label: t.label,
			messages: sessionLog.filter(e => e.task === i).map(({ task: _t, ...rest }) => rest)
		}));
		return { uid, condition, pretext: preScreenReflection, tasks: taskGroups };
	};

	// ── API ────────────────────────────────────────────────────────────────────
	const buildHistory = () =>
		msgs.filter(m => m.text.trim()).map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

	const fetchAiResponse = async (ctx: string, systemPrompt: string) => {
		const res = await fetch('/textgen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: buildHistory(), ctx, systemPrompt }) });
		return ((await res.json()).response ?? '') as string;
	};

	const fetchWatchdog = async (userMessage: string, aiMessage: string, priorChoice: string | null = null) => {
		const res = await fetch('/watchdog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userMessage, aiMessage, priorChoice }) });
		return res.json() as Promise<{ reasoning: string | null; detect: boolean; pattern: string | null; nudge: string | null }>;
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
			task: currentTask,
			user: pendingEntry.user ?? '',
			asst: pendingEntry.asst,
			pattern: pendingEntry.pattern ?? '',
			watchdog: pendingEntry.watchdog ?? null,
			choice: choiceLabel ?? pendingEntry.choice ?? null,
			flagged: false
		}];
		pendingEntry = {};
	};

	// ── AI turn ─────────────────────────────────────────────────────────────────
	const pushAiTurn = async (stepIndex: number, userText = '') => {
		const turn = activeTask.turns[stepIndex];
		generating = true;
		dogVisible = false;
		dogPose = 'idle';
		await new Promise(r => setTimeout(r, 400));

		// Push placeholder
		const placeholder: Msg = turn.options
			? { role: 'ai', kind: 'choice', text: '', options: turn.options }
			: { role: 'ai', kind: 'text', text: '' };
		msgs = [...msgs, placeholder];

		try {
			// Fetch AI response
			const rawText = await fetchAiResponse(turn.ctx, activeTask.systemPrompt);

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

		debugLog = [...debugLog, { task: currentTask, step: stepIndex, pattern: turn.pattern, detect: result.detect, watchdogPattern: result.pattern, nudge: result.nudge }];

		const hasChoiceButtons = msgs[msgs.length - 1].kind === 'choice';

			if (showDog && result.detect) {
				// Dog handles commit on dismiss/answer
				commitEntry();
				setTimeout(() => {
					dogMessage = result.nudge ?? turn.probe;
					dogVisible = true;
					dogPose = 'talk';
					if (enforced) dogLocked = true;
				}, 500);
			} else {
				// Commit immediately (choice field starts null, updated in-place when user picks)
				commitEntry();
			}
		} catch (err) {
			console.error('[pushAiTurn] error:', err);
			generating = false;
		}
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
		if (currentStep < activeTask.turns.length) await pushAiTurn(currentStep, text);
	};

	const chooseOption = (option: { label: string; image?: string; biased: boolean }, msgIndex: number) => {
		if (choiceMade.has(msgIndex) || generating || dogLocked) return;
		choiceMade = new Set([...choiceMade, msgIndex]);
		choiceSelected = new Map([...choiceSelected, [msgIndex, option.label]]);
		// Update the already-committed sessionLog entry with the choice
		const lastEntry = sessionLog.length - 1;
		if (lastEntry >= 0) sessionLog = sessionLog.map((e, i) => i === lastEntry ? { ...e, choice: option.label } : e);
		msgs = [...msgs, { role: 'user', kind: 'text', text: `I'll go with: ${option.label}`, hidden: true }];
	};

	const toggleFlag = (aiIndex: number) => {
		// aiIndex = position among AI messages for current task (matches sessionLog within-task index)
		const taskEntries = sessionLog.map((e, i) => ({ e, i })).filter(({ e }) => e.task === currentTask);
		const target = taskEntries[aiIndex];
		if (!target) return;
		sessionLog = sessionLog.map((e, i) => i === target.i ? { ...e, flagged: !e.flagged } : e);
		console.log('[flag] aiIndex=%d logIndex=%d sessionLog=%o', aiIndex, target.i, sessionLog);
	};

	const onDogDismiss = () => { dogVisible = false; dogPose = 'idle'; };
	const onDogAnswer = (_answer: string) => { dogLocked = false; dogVisible = false; dogPose = 'idle'; };

	const onNext = async () => {
		commitEntry(); // flush any remaining pending
		if (!isLastTask) {
			// Advance to next task: reset chat state, keep log
			currentTask += 1;
			currentStep = 0;
			msgs = [];
			currentMsg = '';
			choiceMade = new Set();
			choiceSelected = new Map();
			pendingEntry = {};
			dogVisible = false;
			dogLocked = false;
			dogPose = 'idle';
			await pushAiTurn(0);
		} else {
			await saveSession(uid, getSessionData());
			window.location.href = `/survey?user_id=${uid}`;
		}
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
		task={activeTask.label}
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
			<div><span class="text-neutral-400">c=</span>{condition} <span class="text-neutral-400">task=</span>{currentTask + 1}/{tasks.length} <span class="text-neutral-400">step=</span>{currentStep}/{activeTask.turns.length}</div>
			<div><span class="text-neutral-400">isDone=</span><span class="{isDone ? 'text-green-400' : 'text-neutral-300'}">{isDone}</span> <span class="text-neutral-400">isLastTask=</span><span class="{isLastTask ? 'text-green-400' : 'text-neutral-300'}">{isLastTask}</span> <span class="text-neutral-400">gen=</span><span class="{generating ? 'text-yellow-300' : 'text-neutral-300'}">{generating}</span></div>
			<div><span class="text-neutral-400">dogLocked=</span><span class="{dogLocked ? 'text-red-400' : 'text-neutral-300'}">{dogLocked}</span> <span class="text-neutral-400">dogVisible=</span><span class="{dogVisible ? 'text-yellow-300' : 'text-neutral-300'}">{dogVisible}</span></div>
			<div><span class="text-neutral-400">pending=</span>{pendingEntry.pattern ?? '—'} <span class="text-neutral-400">choice=</span>{pendingEntry.choice ?? '—'}</div>
			<div><span class="text-neutral-400">log=</span>{sessionLog.length} <span class="text-neutral-400">uid=</span>{uid.slice(0,8)}…</div>
		</div>
		{#each debugLog as entry}
			<div class="rounded bg-black/70 px-2 py-1 text-white backdrop-blur">
				<span class="text-neutral-400">T{entry.task + 1}#{entry.step}</span>
				<span class="ml-1 text-yellow-300">{entry.pattern}</span>
				<span class="ml-1 {entry.detect ? 'text-red-400' : 'text-green-400'}">{entry.detect ? '⚑' : '✓'}</span>
				{#if entry.watchdogPattern}<span class="ml-1 text-purple-300">{entry.watchdogPattern}</span>{/if}
			</div>
		{/each}
	</div>
{/if}
