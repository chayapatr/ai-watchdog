import { redirect } from '@sveltejs/kit';

export const load = ({ url }) => {
	const c = url.searchParams.get('c');
	if (c) redirect(302, `/${c}${url.search.replace(/[?&]c=\d/, '').replace(/^&/, '?')}`);
};
