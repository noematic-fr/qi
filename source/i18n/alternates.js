import fs from 'node:fs';
import path from 'node:path';

const slugPattern = /^[a-z\d]+(?:-[a-z\d]+)*$/;

/**
 * Read `alternateSlug` from blog markdown. Call this from `astro.config.js`
 * with a directory absolute path. Do not derive that path from `import.meta.url`
 * inside a module Vite bundles for prerender: the URL then points at `dist/`.
 * @param {string} blogDirectory
 * @returns {Map<string, string>}
 */
export function loadBlogPairs(blogDirectory) {
	const pairs = new Map();

	for (const fileName of fs.readdirSync(blogDirectory)) {
		if (!fileName.endsWith('.md')) {
			continue;
		}

		const raw = fs.readFileSync(path.join(blogDirectory, fileName), 'utf8');
		const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
		const alternate = frontmatter?.[1].match(/^alternateSlug:\s*(\S+)\s*$/m)?.[1];
		if (!alternate) {
			continue;
		}

		if (!slugPattern.test(alternate)) {
			throw new Error(`Invalid alternateSlug in ${fileName}: ${alternate}`);
		}

		pairs.set(fileName.slice(0, -3), alternate);
	}

	return pairs;
}

/**
 * @param {Array<{id: string, data: {alternateSlug?: string}}>} posts
 * @returns {Map<string, string>}
 */
export function pairsFromPosts(posts) {
	const pairs = new Map();

	for (const post of posts) {
		const alternate = post.data?.alternateSlug;
		if (!alternate) {
			continue;
		}

		if (!slugPattern.test(alternate)) {
			throw new Error(`Invalid alternateSlug for ${post.id}: ${alternate}`);
		}

		pairs.set(post.id, alternate);
	}

	return pairs;
}

/**
 * Public path for hreflang and the language switch.
 * `build.format: 'file'` renders the homepage as `/index.html`. That file is served at `/`.
 */
export function normalizePath(pathname) {
	let normalized = pathname.replace(/\.html$/, '') || '/';
	if (normalized.length > 1 && normalized.endsWith('/')) {
		normalized = normalized.slice(0, -1);
	}

	if (!normalized.startsWith('/')) {
		normalized = `/${normalized}`;
	}

	return normalized === '/index' ? '/' : normalized;
}

/**
 * Path of the same document on the other domain.
 * Blog posts pair only through `alternateSlug`. Other pages keep their path.
 * @param {string} pathname
 * @param {Map<string, string>} pairs
 * @returns {string | null}
 */
export function alternatePath(pathname, pairs) {
	const normalized = normalizePath(pathname);
	if (normalized === '/404') {
		return null;
	}

	const post = /^\/blog\/([^/]+)$/.exec(normalized);
	if (post) {
		const otherSlug = pairs.get(post[1]);
		return otherSlug ? `/blog/${otherSlug}` : null;
	}

	// Page 2+ of the blog index is not a stable pair across languages.
	if (/^\/blog\/\d+$/.test(normalized)) {
		return null;
	}

	return normalized;
}

/**
 * @param {string} pathname
 * @param {{origin: string, alternateOrigin: string, locale: string, alternateLocale: string}} site
 * @param {Map<string, string>} pairs
 */
export function hreflangLinks(pathname, site, pairs) {
	const normalized = normalizePath(pathname);
	const otherPath = alternatePath(normalized, pairs);
	if (!otherPath) {
		return [];
	}

	const selfUrl = new URL(normalized, site.origin).href;
	const otherUrl = new URL(otherPath, site.alternateOrigin).href;
	const englishUrl = site.locale === 'en' ? selfUrl : otherUrl;

	return [
		{lang: site.locale, url: selfUrl},
		{lang: site.alternateLocale, url: otherUrl},
		{lang: 'x-default', url: englishUrl},
	];
}

/**
 * Language switch target. The other homepage when this document has no translation.
 * @param {string} pathname
 * @param {string} alternateOrigin
 * @param {Map<string, string>} pairs
 */
export function languageSwitchHref(pathname, alternateOrigin, pairs) {
	const otherPath = alternatePath(pathname, pairs);
	return new URL(otherPath ?? '/', alternateOrigin).href;
}
