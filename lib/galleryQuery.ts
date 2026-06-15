import type { QueryClient } from '@tanstack/react-query';

/** 나눔 목록을 다시 불러옵니다. reset 대신 invalidate로 기존 데이터를 유지해 무한 로딩을 막습니다. */
export async function refreshGalleryCache(qc: QueryClient) {
  await qc.invalidateQueries({ queryKey: ['gallery'] });
}
