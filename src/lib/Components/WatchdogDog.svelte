<script lang="ts">
	import Dog from './Dog.svelte';
	import type { DogPose } from './Dog.svelte';

	interface Props {
		visible: boolean;
		message: string;
		pose: DogPose;
		enforced: boolean;
		onDismiss: () => void;
		onAnswer: (answer: string) => void;
	}

	let { visible, message, pose, enforced, onDismiss, onAnswer }: Props = $props();

	let answer = $state('');

	const submit = () => {
		if (!answer.trim()) return;
		onAnswer(answer.trim());
		answer = '';
	};
</script>

<div class="fixed bottom-6 right-6 flex flex-col items-center gap-2">
	<div class="transition-opacity duration-300 {visible ? 'opacity-100' : 'pointer-events-none opacity-0'}">
		<div class="relative w-52 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-md">
			<p class="text-sm leading-snug text-neutral-700">{message}</p>
			{#if enforced}
				<div class="mt-2 flex flex-col gap-2">
					<input
						bind:value={answer}
						placeholder="Your answer..."
						class="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
						onkeypress={(e) => { if (e.key === 'Enter') submit(); }}
					/>
					<button
						onclick={submit}
						disabled={!answer.trim()}
						class="w-full rounded-lg bg-purple-500 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-40"
					>
						OK
					</button>
				</div>
			{:else}
				<button
					onclick={onDismiss}
					class="mt-2 text-xs text-neutral-400 hover:text-neutral-600"
				>
					Dismiss
				</button>
			{/if}
			<div class="absolute -bottom-2 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-neutral-200 bg-white"></div>
		</div>
	</div>
	<Dog {pose} size={180} />
</div>
