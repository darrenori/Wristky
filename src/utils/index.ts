export function createPageUrl(pageName: string) {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    return `${base}/${pageName.replace(/ /g, '-')}`;
}
