export const getItemTitle = (item: any): string => {
    return item.title || item.name || '';
};
