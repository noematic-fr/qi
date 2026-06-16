import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';

const appsCollection = defineCollection({
	loader: glob({pattern: '**/*.md', base: './source/content/apps'}),
	schema: z.object({
		draft: z.boolean().default(false),
		isUnlisted: z.boolean().default(false),
		isArchived: z.boolean().default(false),
		title: z.string().nonempty(),
		subtitle: z.string().nonempty(),
		pubDate: z.date(),
		platforms: z.array(z.enum([
			'macOS',
			'iOS',
			'watchOS',
			'tvOS',
			'visionOS',
			'android',
			'Linux',
			'Windows',
		])),
		repoUrl: z.string().url().optional(),
		appStoreId: z.number().int().positive().safe().optional(),
		setappId: z.number().int().positive().safe().optional(),
		isPaid: z.boolean().default(false),
		isMenuBarApp: z.boolean().default(false),
		mainLinks: z.record(z.string().url()).optional(),
		links: z.record(z.string().url()).optional(),
		overflowLinks: z.record(z.string().url()).optional(),
		showSupportLink: z.boolean().default(true),
		redirectUrl: z.string().url().optional(),
		forceHasIosAppIcon: z.boolean().optional(),
		olderMacOSVersions: z.array(z.enum([
			'10.13',
			'10.14',
			'10.15',
			'11',
			'12',
			'13',
			'14',
			'15',
			'16',
			'17',
			'18',
			'19',
			'20',
		])).optional(),
		feedbackNote: z.string().optional(),
	}).strict(),
});

const blogCollection = defineCollection({
	loader: glob({pattern: '**/*.md', base: './source/content/blog'}),
	schema: z.object({
		draft: z.boolean().default(false),
		isUnlisted: z.boolean().default(false),
		title: z.string().nonempty(),
		description: z.string().nonempty().optional(),
		pubDate: z.date(),
		tags: z.array(z.enum([
			'fichiers',
			'gestion',
			'programming',
			'open-source',
			'swift',
			'javascript',
			'nodejs',
		])).optional(),
		redirectUrl: z.string().url().optional(),
	}).strict(),
});

export const collections = {
	apps: appsCollection,
	blog: blogCollection,
};