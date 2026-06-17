export type GalleryFilter = 'all' | 'mine' | 'week' | 'month' | string;

export function isWorshipGalleryFilter(filter: GalleryFilter): boolean {
  return filter !== 'all' && filter !== 'mine' && filter !== 'week' && filter !== 'month';
}

export function gallerySinceDate(filter: GalleryFilter): string | undefined {
  const now = Date.now();
  if (filter === 'week') {
    return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (filter === 'month') {
    return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return undefined;
}
