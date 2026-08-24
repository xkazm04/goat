import { extractTitle } from '@/lib/items/item-utils';

/** Resolve display title using the canonical name > title fallback. */
export const getItemTitle = (item: any): string => {
    return extractTitle(item);
};
