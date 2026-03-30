<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export type DogPose = 'bark' | 'idle' | 'sleep' | 'talk';

	interface Props {
		pose?: DogPose;
		size?: number; // px
	}

	let { pose = 'idle', size = 96 }: Props = $props();

	// GIF timing (measured from source files)
	const LOOP_MS = 5040;
	const TRANS_MS = 5080;
	const FADE_MS = 50;

	const PATHS: Record<string, Record<string, string[]>> = {
		bark:  { idle: [],                 sleep: ['bark-to-sleep'],  talk: [] },
		idle:  { bark: [],                 sleep: ['idle-to-sleep'],  talk: [] },
		sleep: { bark: ['sleep-to-bark'],  idle:  ['sleep-to-idle'],  talk: [] },
		talk:  { bark: [],                 idle:  [],                 sleep: [] },
	};

	const BASE = '/dog/';

	// Two-layer crossfade state
	let layer0: HTMLImageElement;
	let layer1: HTMLImageElement;
	let activeLayer = 0;

	let currentLoopState: DogPose = 'idle';
	let targetState: DogPose = 'idle';
	let isTransitioning = false;
	let transitionQueue: string[] = [];
	let animTimer: ReturnType<typeof setTimeout> | null = null;

	function swapToGif(name: string) {
		const layers = [layer0, layer1];
		const next = 1 - activeLayer;
		const curr = activeLayer;
		layers[next].src = BASE + name + '.gif';
		layers[next].style.opacity = '1';
		layers[curr].style.opacity = '0';
		activeLayer = next;
	}

	function scheduleLoopCheck() {
		if (animTimer) clearTimeout(animTimer);
		animTimer = setTimeout(() => {
			if (targetState !== currentLoopState) {
				beginTransition(targetState);
			} else {
				swapToGif(currentLoopState);
				scheduleLoopCheck();
			}
		}, LOOP_MS - FADE_MS);
	}

	function playLoopState(state: DogPose) {
		currentLoopState = state;
		isTransitioning = false;
		transitionQueue = [];
		swapToGif(state);
		scheduleLoopCheck();
	}

	function beginTransition(target: DogPose) {
		isTransitioning = true;
		transitionQueue = [...(PATHS[currentLoopState]?.[target] ?? [])];
		playNextInQueue(target);
	}

	function playNextInQueue(finalState: DogPose) {
		if (transitionQueue.length === 0) {
			if (targetState !== finalState) {
				currentLoopState = finalState;
				beginTransition(targetState);
			} else {
				playLoopState(finalState);
			}
			return;
		}
		const gifName = transitionQueue.shift()!;
		swapToGif(gifName);
		if (animTimer) clearTimeout(animTimer);
		animTimer = setTimeout(() => playNextInQueue(finalState), TRANS_MS - FADE_MS);
	}

	function requestState(target: DogPose) {
		if (target === targetState) return;
		targetState = target;
		const path = PATHS[currentLoopState]?.[target] ?? [];
		if (path.length === 0 && !isTransitioning) {
			if (animTimer) clearTimeout(animTimer);
			playLoopState(target);
			return;
		}
	}

	// React to prop changes
	$effect(() => {
		requestState(pose);
	});

	onMount(() => {
		playLoopState(pose);
	});

	onDestroy(() => {
		if (animTimer) clearTimeout(animTimer);
	});
</script>

<div class="dog-root" style="width:{size}px; height:{size}px;">
	<img
		bind:this={layer0}
		class="dog-layer"
		style="opacity:0; transition: opacity 0.05s linear;"
		alt=""
	/>
	<img
		bind:this={layer1}
		class="dog-layer"
		style="opacity:0; transition: opacity 0.05s linear;"
		alt=""
	/>
</div>

<style>
	.dog-root {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dog-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
	}
</style>
