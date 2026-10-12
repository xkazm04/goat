import { z } from 'zod';

import { turnSchema } from './critic';

const titled = z.string().trim().min(1).max(200);

/** The list the critic and the gap spotter see, validated at the route boundary. */
const snapshotSchema = z.object({
  title: z.string().trim().max(200),
  topic: z.string().trim().min(1).max(120),
  size: z.number().int().min(1).max(50),
  ranked: z
    .array(
      z.object({
        id: z.string().max(64),
        title: titled,
        year: z.number().int().nullable(),
        creator: z.string().max(200).nullable(),
        note: z.string().max(2000),
      }),
    )
    .max(50),
  pool: z.array(z.object({ id: z.string().max(64), title: titled })).max(60),
});

export const criticBodySchema = z.object({
  snapshot: snapshotSchema,
  turns: z.array(turnSchema).min(1).max(60),
});

export const gapsBodySchema = z.object({ snapshot: snapshotSchema });

export const tagBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  items: z
    .array(z.object({ id: z.string().max(64), title: titled, year: z.number().int().nullable(), creator: z.string().max(200).nullable() }))
    .min(1)
    .max(200),
});
