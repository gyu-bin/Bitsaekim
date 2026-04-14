import { supabase } from '@/lib/supabase';

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** http(s) 또는 프로토콜 상대(//) URL만 통과 */
export function normalizeImageUri(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  let t = stripBom(raw.trim());
  if (t.length === 0) return null;
  if (t.startsWith('//')) {
    t = `https:${t}`;
  }
  if (/^https?:\/\//i.test(t)) return t;
  return null;
}

function isSafeStoragePath(path: string): boolean {
  const p = path.trim();
  if (!p || p.includes('..')) return false;
  return true;
}

/**
 * Supabase Storage 공개 URL에서 bucket `gallery` 기준 object path 추출
 * 예: .../object/public/gallery/a/b.jpg → a/b.jpg
 */
export function galleryPublicUrlToObjectPath(publicUrl: string): string | null {
  const t = publicUrl.trim();
  const publicMarker = '/object/public/gallery/';
  const signMarker = '/object/sign/gallery/';
  let idx = t.indexOf(publicMarker);
  let markerLen = publicMarker.length;
  if (idx === -1) {
    idx = t.indexOf(signMarker);
    markerLen = signMarker.length;
  }
  if (idx === -1) return null;
  const rest = t.slice(idx + markerLen);
  const withoutQuery = rest.split('?')[0] ?? rest;
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

/**
 * DB에 저장된 값이 전체 공개 URL이든 `deviceId/postId.jpg` 같은 경로만이든
 * gallery 버킷 기준 object path로 정규화
 */
export function getGalleryObjectPathFromStoredValue(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  let t = stripBom(raw.trim());
  if (t.length === 0) return null;

  const fromUrl = galleryPublicUrlToObjectPath(t);
  if (fromUrl) return fromUrl;

  const normalized = normalizeImageUri(t);
  if (normalized) {
    const fromNorm = galleryPublicUrlToObjectPath(normalized);
    if (fromNorm) return fromNorm;
  }

  if (/^https?:\/\//i.test(t)) return null;

  const cleanPath = t.replace(/^\/+/, '');
  if (!isSafeStoragePath(cleanPath)) return null;
  return cleanPath;
}

/** 화면에 넣을 수 있는 최종 http(s) URL (경로만 저장된 경우 getPublicUrl로 조합) */
export function resolveGalleryImageUrlForDisplay(raw: string | null | undefined): string | null {
  const direct = normalizeImageUri(raw);
  if (direct) return direct;

  const path = getGalleryObjectPathFromStoredValue(raw);
  if (!path) return null;
  const { data } = supabase.storage.from('gallery').getPublicUrl(path);
  return data.publicUrl ?? null;
}

/** 공개 URL이 막혀 있을 때(정책 등) 임시 서명 URL로 재시도 */
export async function getGallerySignedImageUrl(storedValue: string): Promise<string | null> {
  const path = getGalleryObjectPathFromStoredValue(storedValue);
  if (!path) return null;
  const { data, error } = await supabase.storage.from('gallery').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * 피드·카드에서 사용: 버킷이 비공개면 `/object/public/...` URL은 403이라 로드 실패.
 * 서명 URL을 먼저 받고, 실패 시에만 공개 URL로 폴백.
 */
export async function getPreferredGalleryDisplayUrl(
  raw: string | null | undefined
): Promise<string | null> {
  const path = getGalleryObjectPathFromStoredValue(raw);
  if (!path) return null;
  const { data, error } = await supabase.storage.from('gallery').createSignedUrl(path, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;
  return resolveGalleryImageUrlForDisplay(raw);
}
