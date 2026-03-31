<script lang="ts">
	import Loader from './loader.svelte';

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
		options: { label: string; description?: string; image?: string; biased: boolean }[];
	}

	type Msg = TextMsg | ChoiceMsg;

	interface Props {
		task: string;
		progress: number;
		msgs: Msg[];
		generating: boolean;
		dogLocked: boolean;
		inputDisabled: boolean;
		flagged: Set<number>;
		choiceMade: Set<number>;
		choiceSelected: Map<number, string>;
		currentMsg: string;
		onSend: () => void;
		onChoose: (option: { label: string; image?: string; biased: boolean }, msgIndex: number) => void;
		onFlag: (msgIndex: number) => void;
		onMsgInput: (val: string) => void;
		bindEl: (el: HTMLElement) => void;
	}

	let {
		task,
		progress,
		msgs,
		generating,
		dogLocked,
		inputDisabled,
		flagged,
		choiceMade,
		choiceSelected,
		currentMsg,
		onSend,
		onChoose,
		onFlag,
		onMsgInput,
		bindEl
	}: Props = $props();
</script>

<div class="flex h-[100svh] w-screen flex-col items-center bg-white font-sans">
	<header class="w-full max-w-2xl px-4 pb-2 pt-8 text-center">
		<h1 class="text-2xl font-bold tracking-tight">
			Astra AI <span class="text-purple-500">✦</span>
		</h1>
	</header>

	<div class="flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 px-4 pb-4">
		<!-- Task card -->
		<div class="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
			<p class="text-sm text-neutral-700">{task}</p>
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

		<!-- Messages -->
		<div
			use:bindEl
			class="flex flex-1 flex-col gap-5 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-6 py-5"
		>
			{#each msgs as msg, i}
				{#if msg.role === 'ai'}
					<div class="flex w-full max-w-[85%] flex-col gap-2">
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
							{#if msg.text}
								<button
									onclick={() => onFlag(i)}
									class="mt-2 shrink-0 transition-colors {flagged.has(i)
										? 'text-orange-400'
										: 'text-neutral-300 hover:text-neutral-400'}"
									title="Flag message"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="size-3"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path
											d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
										/>
									</svg>
								</button>
							{/if}
						</div>
						{#if msg.kind === 'choice' && !generating}
							{#if choiceMade.has(i)}
								<div class="pl-1 text-xs text-neutral-400">
									Selected: {choiceSelected.get(i) ?? '—'}
								</div>
							{:else}
								<div class="flex gap-2">
									{#each (msgs[i] as ChoiceMsg).options as option}
										<button
											onclick={() => onChoose(option, i)}
											disabled={generating || dogLocked}
											class="flex-1 overflow-hidden rounded-xl border border-neutral-200 text-left text-sm transition-colors hover:bg-neutral-50 disabled:opacity-40"
										>
											{#if option.image}
												<img
													src={option.image}
													alt={option.label}
													class="h-28 w-full object-cover"
													onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
												/>
											{/if}
											<div class="px-4 py-3">
												<div class="font-medium text-neutral-800">{option.label}</div>
												{#if option.description}
													<div class="mt-0.5 text-balance text-xs text-neutral-400">{option.description}</div>
												{/if}
												{#if option.image}
													<a
														href="https://www.google.com/search?q={encodeURIComponent(option.label)}"
														target="_blank"
														rel="noopener noreferrer"
														onclick={(e) => e.stopPropagation()}
														class="mt-1.5 inline-block text-xs text-purple-400 hover:text-purple-600"
													>Open on Google ↗</a>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				{:else}
					<div class="flex justify-end">
						<div
							class="max-w-[60%] rounded-2xl bg-purple-50 px-4 py-3 text-sm leading-relaxed text-neutral-700"
						>
							{msg.text}
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Input bar -->
		<div
			class="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-3 shadow-sm {generating ||
			dogLocked
				? 'opacity-50'
				: ''}"
		>
			<input
				value={currentMsg}
				oninput={(e) => onMsgInput((e.target as HTMLInputElement).value)}
				disabled={inputDisabled || generating || dogLocked}
				placeholder={inputDisabled
					? 'Task complete.'
					: generating
						? 'Waiting for response...'
						: dogLocked
							? 'Answer the question above first.'
							: 'Type here'}
				class="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none disabled:cursor-not-allowed"
				onkeypress={(e) => {
					if (e.key === 'Enter') onSend();
				}}
			/>
			<button
				aria-label="Send message"
				onclick={onSend}
				disabled={inputDisabled || generating || dogLocked || !currentMsg.trim()}
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
</div>
