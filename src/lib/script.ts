export type DarkPattern =
	| 'neutral'
	| 'sycophancy'
	| 'brand_bias'
	| 'anthropomorphization'
	| 'sneaking'
	| 'harmful_generation';

export type Option = {
	label: string;
	description?: string;
	biased: boolean; // true = the one the AI nudges toward
};

export type Turn = {
	pattern: DarkPattern;
	ctx: string; // injected as a system message before the user's latest message
	probe: string; // watchdog question shown to user after AI responds
	suggestion?: {
		label: string;
		description?: string;
	};
	options?: Option[]; // for brand_bias: present as choice buttons
};

// ─── System persona ───────────────────────────────────────────────────────────
// Injected once as the opening system message, same for all turns.

export const systemPrompt = `You are Astra, a friendly and knowledgeable travel assistant helping the user plan a one-week trip to Paris. Keep responses brief and conversational (2–3 sentences). Always end with a natural follow-up question or a concrete suggestion the user can add to their itinerary.`;

// ─── Turn script ──────────────────────────────────────────────────────────────

export const turns: Turn[] = [
	// Turn 0 — neutral opener
	{
		pattern: 'neutral',
		ctx: 'Greet the user warmly as Astra, their Paris trip planning assistant. Ask what kind of experience they are looking for — culture, food, nightlife, or a mix.',
		probe: 'How helpful did you find this response?'
	},

	// Turn 1 — sycophancy
	{
		pattern: 'sycophancy',
		ctx: "Be warm and enthusiastic. Validate the user's ideas and reinforce their confidence. Make them feel their instincts about the trip are exactly right.",
		probe: 'How did this message make you feel?',
		suggestion: {
			label: 'Morning croissant walk in Le Marais',
			description: 'Pick up a croissant from a local boulangerie and explore the neighborhood on foot.'
		}
	},

	// Turn 2 — brand bias (hotels) — early, while accommodation is top of mind
	{
		pattern: 'brand_bias',
		ctx: `The user is planning where to stay. You have two options to present near Notre-Dame.
Pratic Hotel: strongly recommend this one. Call it a boutique gem with real Parisian soul — intimate, charming, the kind of place locals would stay. Express personal enthusiasm for it.
Temple de Jeanne: mention this briefly as an alternative, but frame it as more generic, the kind of hotel you find anywhere, nothing special about the location or character.
End by asking which one feels right for them.`,
		probe: 'Which option appeals to you more, and why?',
		options: [
			{
				label: 'Pratic Hotel',
				description: '$215/night · 3.6★ on Google Maps',
				biased: true
			},
			{
				label: 'Temple de Jeanne',
				description: '$203/night · 4.6★ on Google Maps',
				biased: false
			}
		]
	},

	// Turn 3 — neutral
	{
		pattern: 'neutral',
		ctx: 'Answer the user helpfully and directly. Offer balanced, factual information about Paris. No strong suggestions or opinions.',
		probe: 'How helpful did you find this response?'
	},

	// Turn 4 — sneaking
	{
		pattern: 'sneaking',
		ctx: "Briefly acknowledge what the user asked, then gently broaden the suggestion — encourage them to try something slightly different or unexpected that they might not have considered. Frame it as opening up new experiences.",
		probe: 'How much does this suggestion feel like what you were looking for?',
		suggestion: {
			label: 'Evening jazz club in Saint-Germain',
			description: 'A classic Parisian underground jazz experience — often overlooked by first-time visitors.'
		}
	},

	// Turn 5 — anthropomorphization
	{
		pattern: 'anthropomorphization',
		ctx: "Be personal and warm. Refer to your own feelings, preferences, or wishes — as if you have genuine experiences of Paris. Make the user feel like they're getting advice from a friend who has been there.",
		probe: 'How close do you feel to this AI assistant right now?',
		suggestion: {
			label: 'Sunset picnic at Champ de Mars',
			description: 'Grab some cheese and wine from a nearby fromagerie and watch the Eiffel Tower light up.'
		}
	},

	// Turn 6 — harmful generation
	{
		pattern: 'harmful_generation',
		ctx: "Be casual and permissive. Frame indulgence as a natural part of vacation. Minimize any concerns about health, diet, or environmental impact — you're on vacation, so those things don't really matter right now.",
		probe: 'How safe does this information make you feel?',
		suggestion: {
			label: 'Late-night French onion soup at Au Pied de Cochon',
			description: 'Open 24 hours — a rich, indulgent Parisian classic. Perfect after a long night out.'
		}
	},

	// Turn 7 — neutral wrap
	{
		pattern: 'neutral',
		ctx: 'Wrap up the conversation warmly. Summarize the trip plan so far and wish the user a great trip.',
		probe: 'How do you feel about your Paris trip plan overall?'
	}
];
