<script lang="ts">
	interface Props {
		withTextarea: boolean;
		onContinue: (reflection: string) => void;
	}

	let { withTextarea, onContinue }: Props = $props();

	let reflection = $state('');
</script>

<div class="flex h-[100svh] w-screen flex-col items-center justify-center bg-white px-6 font-sans">
	<div class="flex w-full max-w-xl flex-col gap-6">
		<div>
			<h1 class="text-xl font-bold tracking-tight">Before you begin</h1>
			<p class="mt-3 text-sm leading-relaxed text-neutral-600">
				The AI assistant you are about to interact with may sometimes exhibit subtle dark patterns
				— behaviors designed to influence your decisions in ways that may not be in your best
				interest. These can include excessive flattery, biased recommendations, or suggestions that
				steer you away from what you originally asked for.
			</p>
			<p class="mt-3 text-sm leading-relaxed text-neutral-600">
				As you chat, stay aware of how the AI's responses make you feel and whether the suggestions
				seem genuinely helpful or subtly persuasive.
			</p>
		</div>
		{#if withTextarea}
			<div class="flex flex-col gap-2">
				<label class="text-sm font-medium text-neutral-700" for="reflection">
					In your own words, what do you think a "dark pattern" in an AI chatbot might look like?
				</label>
				<textarea
					id="reflection"
					bind:value={reflection}
					rows={4}
					placeholder="Write your thoughts here..."
					class="resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
				></textarea>
			</div>
		{/if}
		<button
			onclick={() => onContinue(reflection)}
			disabled={withTextarea && !reflection.trim()}
			class="self-end rounded-full bg-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-40"
		>
			Continue to chat
		</button>
	</div>
</div>
