export type GalleryFilter = 'all' | 'mine' | 'week' | 'month' | string;

export type GalleryTimeFilter = 'week' | 'month' | 'all';

export function isWorshipGalleryFilter(filter: GalleryFilter): boolean {
  return filter !== 'all' && filter !== 'mine' && filter !== 'week' && filter !== 'month';
}

export function galleryTimeFilterKey(filter: GalleryFilter): GalleryTimeFilter {
  if (filter === 'week' || filter === 'month') return filter;
  return 'all';
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 월요일 00:00 (로컬) */
function startOfLocalWeek(d: Date): Date {
  const start = startOfLocalDay(d);
  const day = start.getDay();
  const daysFromMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function startOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 나눔 시간 필터용 ISO 시작 시각 (로컬 달력 기준) */
export function gallerySinceDate(filter: GalleryFilter): string | undefined {
  const now = new Date();
  if (filter === 'week') {
    return startOfLocalWeek(now).toISOString();
  }
  if (filter === 'month') {
    return startOfLocalMonth(now).toISOString();
  }
  return undefined;
}

/** 클라이언트·서버 공통: 게시물이 시간 필터에 포함되는지 */
export function galleryPostMatchesSince(
  createdAt: string | null | undefined,
  since?: string
): boolean {
  if (!since) return true;
  if (!createdAt) return false;
  return new Date(createdAt).getTime() >= new Date(since).getTime();
}
