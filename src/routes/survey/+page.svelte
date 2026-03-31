<script lang="ts">
	import { page } from '$app/state';

	const uid = page.url.searchParams.get('user_id') ?? '';
	const surveyUrl = `https://qualtricsxm9v3x3gbfc.qualtrics.com/jfe/form/SV_cuLNa0e2GUWavCm?user_id=${uid}`;

	const PASSWORD = 'thankyou2025';
	let input = $state('');
	let wrong = $state(false);

	const tryUnlock = () => {
		if (input.trim() === PASSWORD) {
			window.location.href = 'https://google.com';
		} else {
			wrong = true;
			setTimeout(() => (wrong = false), 1500);
		}
	};
</script>

<div class="flex h-[100svh] w-screen flex-col font-sans">
	<iframe src={surveyUrl} class="w-full flex-1 border-0" title="Post-study survey"></iframe>
	<div class="flex items-center gap-2 border-t border-neutral-200 bg-white px-4 py-3">
		<input
			bind:value={input}
			type="password"
			placeholder="Enter completion code..."
			class="flex-1 rounded-full border px-4 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-300 {wrong
				? 'border-red-400'
				: 'border-neutral-200'}"
			onkeypress={(e) => {
				if (e.key === 'Enter') tryUnlock();
			}}
		/>
		<button
			onclick={tryUnlock}
			disabled={!input.trim()}
			class="rounded-full bg-purple-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-40"
		>
			Next →
		</button>
	</div>
</div>
