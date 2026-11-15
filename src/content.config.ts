import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { z } from 'astro/zod';

// kind 為 entry（含未填）的頁面，下列欄位必填；index / repo / page 不需要。
const entryRequired = ['description', 'status', 'priority', 'repos', 'updated'] as const;

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z
				.object({
					kind: z.enum(['entry', 'index', 'repo', 'page']).default('entry'),
					status: z.enum(['todo', 'learning', 'done']).optional(),
					priority: z.enum(['high', 'medium', 'low']).optional(),
					repos: z.array(z.string()).optional(),
					tags: z.array(z.string()).default([]),
					updated: z.date().optional(),
				})
				.superRefine((data, ctx) => {
					if (data.kind !== 'entry') return;
					for (const key of entryRequired) {
						if (data[key as keyof typeof data] === undefined) {
							ctx.addIssue({
								code: 'custom',
								path: [key],
								message: `kind 為 entry 的條目必須填寫 ${key}`,
							});
						}
					}
				}),
		}),
	}),
};
