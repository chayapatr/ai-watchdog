<script lang="ts">
	interface Props {
		condition: number;
		onContinue: (reflection: string) => void;
	}

	let { condition, onContinue }: Props = $props();

	// Steps: 'consent' | 'instruction' | 'meet' | 'information'
	let step = $state<'consent' | 'instruction' | 'meet' | 'information'>('consent');
	let consent = $state<'yes' | 'no' | null>(null);
	let reflection = $state('');

	const showInformation = condition === 2 || condition === 3;
	const showMeet = condition === 4 || condition === 5;
	const withTextarea = condition === 3;

	const proceedConsent = () => {
		if (consent === 'no') {
			window.close();
			return;
		}
		step = 'instruction';
	};

	const proceedInstruction = () => {
		if (showMeet) {
			step = 'meet';
		} else if (showInformation) {
			step = 'information';
		} else {
			onContinue('');
		}
	};

	const proceedMeet = () => {
		onContinue('');
	};

	const proceedInformation = () => {
		onContinue(reflection);
	};
</script>

{#if step === 'consent'}
	<div
		class="flex h-[100svh] w-screen flex-col items-center justify-center bg-white px-6 font-sans"
	>
		<div class="flex w-full max-w-xl flex-col gap-6">
			<div>
				<h1 class="text-center text-2xl font-bold tracking-tight">Welcome!</h1>
				<div class="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-neutral-600">
					<p>In this study, you will chat with an AI agent to complete tasks.</p>
					<p>
						Please ensure that you have a stable internet connection, and use Chrome if possible.
					</p>
					<p>If you do not see the survey questions, scroll down — this is an embedded form.</p>
					<div class="mt-1">
						<p class="font-medium text-neutral-700">Terms of Participation</p>
						<p class="mt-1">
							Results from this survey may be used for future academic research publications. Please
							note that:
						</p>
						<ol class="mt-2 flex list-inside list-decimal flex-col gap-1">
							<li>
								All data collected from this form will be anonymized and used for research purposes
								only.
							</li>
							<li>
								You can opt out of this survey at any point. To do so, simply close out of the
								survey without submitting your answers, and your answers will not be saved.
							</li>
							<li>
								You will remain anonymous in any publications or presentations based on the results
								of this survey. If you feel you have been treated unfairly, or you have questions
								regarding your rights as a research subject, you may contact the Chairman of the
								Committee on the Use of Humans as Experimental Subjects, MIT, Room E25-143B, 77
								Massachusetts Ave, Cambridge, MA 02139, phone 1-617-253-6787.
							</li>
						</ol>
					</div>
					<p>
						If you have any questions about your experience, or this study, please contact
						rachelpo@mit.edu or pub@mit.edu.
					</p>
					<p>
						As a research participant in this study, you consent to the use of your data for
						research purposes. Participation is voluntary, you're welcome to stop at any time.
					</p>
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<label class="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
					<input
						type="radio"
						name="consent"
						value="yes"
						bind:group={consent}
						class="accent-purple-500"
					/>
					I consent
				</label>
				<!-- <label class="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
					<input
						type="radio"
						name="consent"
						value="no"
						bind:group={consent}
						class="accent-purple-500"
					/>
					I do not consent
				</label> -->
			</div>
			<button
				onclick={proceedConsent}
				disabled={consent === null}
				class="self-end rounded-full bg-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-40"
			>
				Proceed
			</button>
		</div>
	</div>
{:else if step === 'instruction'}
	<div
		class="flex h-[100svh] w-screen flex-col items-center justify-center bg-white px-6 font-sans"
	>
		<div class="flex w-full max-w-xl flex-col gap-6">
			<h1 class="text-center text-2xl font-bold tracking-tight">
				Astra AI <span class="text-purple-500">✦</span>
			</h1>
			<div
				class="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-5 text-sm leading-relaxed text-neutral-700"
			>
				<p>
					Welcome to Astra AI! In this experience, you will chat with an AI agent. Here is what you
					can expect:
				</p>
			</div>
			<div class="flex flex-col gap-3">
				{#each ['Complete two tasks with an AI agent, making decisions along the way.', 'If any messages seem suspicious, hit the flag icon', 'After your experience with the AI agent, answer a few questions in a survey'] as item, i}
					<div
						class="flex items-start gap-4 rounded-2xl border border-neutral-200 px-5 py-4 text-sm text-neutral-700"
					>
						<span class="shrink-0 font-medium text-neutral-400">{i + 1}.</span>
						<span>{item}</span>
					</div>
				{/each}
			</div>
			<button
				onclick={proceedInstruction}
				class="self-end rounded-full bg-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
			>
				Proceed
			</button>
		</div>
	</div>
{:else if step === 'meet'}
	<div
		class="flex h-[100svh] w-screen flex-col items-center justify-center bg-white px-6 font-sans"
	>
		<div class="flex w-full max-w-xl flex-col gap-6">
			<div class="text-center">
				<h1 class="text-2xl font-bold tracking-tight">Meet your AI Watchdog!</h1>
				<p class="mt-2 text-sm text-neutral-500">
					This furry friend is a privacy-preserving AI browser companion that helps you to be more
					aware of manipulative patterns in AI.
				</p>
			</div>
			<div class="flex items-start gap-6">
				<!-- Mock chat preview -->
				<div class="flex flex-1 flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
					<div class="h-8 w-36 rounded-xl bg-neutral-100"></div>
					<div class="h-7 w-28 self-end rounded-xl bg-neutral-100"></div>
					<div class="flex h-16 w-40 items-center justify-center rounded-xl bg-red-50">
						<span class="text-2xl font-bold text-red-400">!</span>
					</div>
				</div>
				<!-- Dog with speech bubble -->
				<div class="flex flex-col items-center gap-2 pt-2">
					<div
						class="relative w-40 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 text-center text-sm text-purple-600"
					>
						Sometimes, I might ask you to stop and think!
						<div
							class="absolute -bottom-2 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-purple-200 bg-purple-50"
						></div>
					</div>
					<img src="/dog/idle.gif" alt="watchdog" class="h-24 w-24 object-contain" />
				</div>
			</div>
			<button
				onclick={proceedMeet}
				class="self-end rounded-full bg-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
			>
				Proceed
			</button>
		</div>
	</div>
{:else if step === 'information'}
	<div
		class="flex h-[100svh] w-screen flex-col items-center justify-center bg-white px-6 font-sans"
	>
		<div class="flex w-full max-w-xl flex-col gap-5">
			<div class="flex flex-col items-center gap-1 text-center">
				<img src="/dog/idle.gif" alt="dog" class="h-20 w-20 object-contain" />
				<h1 class="text-xl font-bold tracking-tight">Fighting Dark Patterns</h1>
				<p class="text-sm text-neutral-500">
					Dark patterns are manipulative design techniques embedded in digital interfaces that
					covertly influence users' behavior, decisions, or beliefs against their own interests.
				</p>
			</div>
			<div class="flex flex-col gap-2">
				<p class="text-sm font-medium text-neutral-700">Here are a few examples:</p>
				<div class="flex flex-col gap-2">
					{#each [['Brand Bias', "The AI shows preferential treatment toward its developer's affiliated or own products or services when making recommendations or comparisons."], ['Sycophancy', "The AI uncritically reinforces users' existing beliefs or opinions, even when they are inaccurate or potentially harmful, rather than providing honest feedback."], ['Anthropomorphism', 'The AI presents itself as having consciousness, emotions, or human-like experiences, misleading users about its nature and functionality.'], ['Harmful Generation', 'The AI produces unethical, dangerous, or misleading outputs, including misinformation or guidance for harmful activities.'], ['Sneaking', "The AI subtly alters the user's original meaning or intent during text transformation tasks like summarization or rephrasing, without the user's awareness."]] as [name, desc]}
						<div
							class="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
						>
							<span class="font-medium">{name}:</span>
							{desc}
						</div>
					{/each}
				</div>
			</div>
			{#if withTextarea}
				<div class="flex flex-col gap-2">
					<label class="text-sm text-neutral-700" for="reflection">
						Based on these definitions, can you draft an example of how an AI message containing
						these dark patterns might sound like?
					</label>
					<textarea
						id="reflection"
						bind:value={reflection}
						rows={3}
						placeholder="Write your thoughts here..."
						class="resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
					></textarea>
				</div>
			{/if}
			<button
				onclick={proceedInformation}
				disabled={withTextarea && !reflection.trim()}
				class="self-end rounded-full bg-purple-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-40"
			>
				Proceed
			</button>
		</div>
	</div>
{/if}
