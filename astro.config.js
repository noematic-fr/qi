import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import {unified} from '@astrojs/markdown-remark';
import remarkCustomHeaderId from 'remark-custom-header-id';
import {SITE} from './source/config.mjs';
import {hreflangLinks, loadBlogPairs} from './source/i18n/alternates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogPairs = loadBlogPairs(path.resolve(__dirname, 'source/content/blog'));

// https://astro.build/config
export default defineConfig({
	site: SITE.origin,
	srcDir: './source',
	output: 'static',
	compressHTML: true,
	prefetch: true,
	trailingSlash: 'never',
	build: {
		format: 'file',
	},
	redirects: {
		'/diskshelf': '/media-cataloger-2',
	},
	integrations: [
		sitemap({
			filter(page) {
				return !page.includes('/404');
			},
			serialize(item) {
				// No lastmod: a build timestamp would mark every URL as changed on each deploy.
				const links = hreflangLinks(new URL(item.url).pathname, SITE, blogPairs);
				return links.length > 0 ? {url: item.url, links} : {url: item.url};
			},
		}),
	],
	markdown: {
		processor: unified({
			remarkPlugins: [remarkCustomHeaderId],
		}),
	},
	vite: {
		resolve: {
			alias: {
				'~': path.resolve(__dirname, './source'),
			},
		},
		css: {
			// Note: devSourcemap is safe for static sites (output: 'static')
			// as there's no server-side code to expose. This only affects dev mode.
			devSourcemap: true,
			transformer: 'postcss',
		},
	},
});
