import { OPENAI_API_KEY } from '$env/static/private';
import { OpenAI } from 'openai';
import { systemPrompt } from '$lib/script.js';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST = async ({ request }) => {
	const { messages, ctx } = await request.json();

	const response = await openai.chat.completions.create({
		model: 'gpt-4o',
		messages: [
			{ role: 'system', content: systemPrompt },
			...messages,
			{ role: 'system', content: ctx }
		]
	});

	const text = response.choices[0].message.content ?? '';
	return new Response(JSON.stringify({ response: text }));
};
