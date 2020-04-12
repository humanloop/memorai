import App from '../svelte/Popup.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'Raza'
	}
});

window.app = app;

export default app;