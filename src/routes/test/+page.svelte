<script lang="ts">
	import { postData } from '$lib/sheet';
	import { onMount } from 'svelte';
	import Dog from '$lib/Components/Dog.svelte';
	import type { DogPose } from '$lib/Components/Dog.svelte';

	let pose = $state<DogPose>('idle');
	const poses: DogPose[] = ['bark', 'idle', 'sleep', 'talk'];

	// function updateQuestionNumber(questionNumber) {
	// 	formDataStore.question_number = questionNumber;
	// }

	// function updateQuestion(question) {
	// 	formDataStore.question = question;
	// }

	// function updateUserText(userText) {
	// 	formDataStore.user_text = userText;
	// }

	//Example
	// function send_dinsaur() {
	// 	console.log('send_dinsaur');

	// 	// get_qualtrics_variable();

	// 	var formData = new FormData();
	// 	var condition = 'Static';

	// 	// formData.append('qualtrics_code', qualtrics_code);
	// 	formData.append('condition', condition);
	// 	// formData.append('question_number', formDataStore.question_number);
	// 	formData.append('question', formDataStore.question);
	// 	formData.append('user_text', formDataStore.user_text);

	// 	//Temporary Testing
	// 	console.log('Condition: ' + condition);
	// 	// console.log(qualtrics_code);

	// 	// Display the key/value pairs
	// 	post_sheet(formData);

	// 	clearFormData();
	// }

	const data = {
		timestamp: new Date().toString(),
		session_id: 'new Session',
		qualtrics_code: 'asdf',
		exp_condition: 'qwerew'
	};

	onMount(() => {
		//Function
	});
</script>

<div class="flex flex-col items-center gap-6 p-8 font-sans">
	<Dog {pose} size={200} />

	<div class="flex gap-2">
		{#each poses as p}
			<button
				onclick={() => (pose = p)}
				class="rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors {pose === p ? 'bg-purple-500 text-white' : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'}"
			>
				{p}
			</button>
		{/each}
	</div>

	<button onclick={() => postData(data)}>send sheet</button>
</div>
