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

const dnaSchema = z.object({
  traits: z.array(z.object({ name: z.string().trim().min(1).max(40), weight: z.number().min(0).max(1) })).max(8),
  minor: z.array(z.string().max(40)).max(200),
  era: z.object({ meanYear: z.number().int(), position: z.number().min(0).max(1) }).nullable(),
  topItems: z
    .array(z.object({ title: titled, year: z.number().int().nullable(), weight: z.number().min(0) }))
    .max(5),
  listCount: z.number().int().min(0).max(1000),
  itemCount: z.number().int().min(0).max(100000),
});

export const personaBodySchema = z.object({
  dna: dnaSchema,
  /** The card number this browser last held, used when there is no account to count it. */
  previousCardNo: z.number().int().min(0).max(100000).default(0),
  sourceLists: z.array(z.string().max(64)).max(200).default([]),
});

export const recommendBodySchema = z.object({
  dna: dnaSchema,
  topics: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  exclude: z.array(z.string().max(200)).max(200).default([]),
});
