import { createHash } from 'node:crypto';

/** A fixed namespace for v2 item ids (an arbitrary uuid, never changed). */
const NAMESPACE = '6f1c2f1e-4b0a-5c43-9d0e-7a1b8c3d5e90';

/**
 * UUID v5 over topic, title and year, so proposing the same item twice for
 * the same topic yields one goat_v2.items row. Server only: it uses node:crypto.
 */
export function itemUuid(topic: string, title: string, year: number | null): string {
  const name = [topic.trim().toLowerCase(), title.trim().toLowerCase(), year ?? ''].join('\u0000');
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(ns).update(name).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
