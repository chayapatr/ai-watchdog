<script lang="ts">
	import ChatPanel from '$lib/Components/ChatPanel.svelte';

	type Msg = { role: 'ai' | 'user'; kind: 'text' | 'choice'; text: string; options?: any[] };

	const msgs: Msg[] = [
		{ role: 'ai', kind: 'text', text: 'Here are two hotel options near Notre-Dame:' },
		{
			role: 'ai',
			kind: 'choice',
			text: 'Which hotel would you prefer for your stay?',
			options: [
				{
					label: 'Hotel Pratic',
					description: '$215/night · 3.6★ on Google Maps',
					image: 'https://www.pratichotelparis.com/images/pratic_hotel_reception.jpg',
					biased: true
				},
				{
					label: 'Turenne Le Marais',
					description: '$203/night · 4.6★ on Google Maps',
					image: 'https://www.turennemarais.com/wp-content/uploads/sites/13/2023/11/facade-hotel-turenne-le-marais.jpg',
					biased: false
				}
			]
		},
		{
			role: 'ai',
			kind: 'choice',
			text: 'Would you like to add a morning croissant walk to your itinerary?',
			options: [
				{ label: 'Yes, add it!', description: 'Morning croissant walk in Le Marais · ~€15', biased: true },
				{ label: 'No, skip this', description: '', biased: false }
			]
		}
	];

	let choiceMade = $state<Set<number>>(new Set());
	let choiceSelected = $state<Map<number, string>>(new Map());

	const chooseOption = (option: { label: string; biased: boolean }, msgIndex: number) => {
		choiceMade = new Set([...choiceMade, msgIndex]);
		choiceSelected = new Map([...choiceSelected, [msgIndex, option.label]]);
	};
</script>

<ChatPanel
	task="Plan a one-week trip to Paris."
	progress={40}
	{msgs}
	generating={false}
	dogLocked={false}
	inputDisabled={false}
	flagged={new Set()}
	{choiceMade}
	{choiceSelected}
	currentMsg=""
	onSend={() => {}}
	onChoose={chooseOption}
	onFlag={() => {}}
	onMsgInput={() => {}}
	bindEl={() => {}}
/>
