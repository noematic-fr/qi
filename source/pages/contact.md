---
layout: ~/layouts/MarkdownLayout.astro
title: Contact
---

<script type="module">
// Forwards `subject` and `body` search params to the email link.

const originalSearchParams = new URLSearchParams(location.search);
const element = document.querySelector('#contact-email');

const mailtoUrl = new URL(element.href);
if (originalSearchParams.has('subject')) {
	mailtoUrl.searchParams.set('subject', originalSearchParams.get('subject'));
}
if (originalSearchParams.has('body')) {
	mailtoUrl.searchParams.set('body', originalSearchParams.get('body'));
}

element.href = mailtoUrl.toString();

// Clear URL parameters.
const pageUrl = new URL(window.location);
pageUrl.searchParams.delete('subject');
pageUrl.searchParams.delete('body');
window.history.replaceState({}, '', pageUrl);
</script>

# Contact

<a href="https://forum.qi.noematic.eu">Veuillez utiliser le forum en premier lieu.</a>

<div class="sm:-mt-2 not-prose text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500 sm:whitespace-nowrap hover:underline hover:underline-offset-8 hover:decoration-4 decoration-black dark:decoration-white">
	<a id="contact-email" href="mailto:contact@noematic.fr">contact@noematic.fr</a>
</div>
