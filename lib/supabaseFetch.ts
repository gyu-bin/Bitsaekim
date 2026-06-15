import axios, { type AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

function toUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

function mergeAbortSignal(
  outer: AbortSignal | null | undefined,
  inner: AbortController
): AbortSignal {
  if (!outer) return inner.signal;
  if (outer.aborted) {
    inner.abort();
    return inner.signal;
  }
  outer.addEventListener('abort', () => inner.abort(), { once: true });
  return inner.signal;
}

/** iOS 26 등 정상 환경에서는 네이티브 fetch (UTF-8 정상). */
async function tryNativeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 12_000
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = mergeAbortSignal(init?.signal, controller);

  try {
    const res = await fetch(input, { ...init, signal });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isTextLikeResponse(contentType: string, status: number): boolean {
  if (status === 204) return true;
  const ct = contentType.toLowerCase();
  return ct.includes('application/json') || ct.includes('text/') || ct === '';
}

/**
 * iOS 18.4 시뮬레이터 fetch 버그 우회용 axios 폴백.
 * arraybuffer 를 Latin-1 로 읽으면 한글이 깨지므로 UTF-8 TextDecoder 사용.
 */
async function axiosFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = toUrl(input);
  const config: AxiosRequestConfig = {
    url,
    method: (init?.method ?? 'GET').toLowerCase() as AxiosRequestConfig['method'],
    headers: toHeaderRecord(init?.headers),
    data: init?.body ?? undefined,
    validateStatus: () => true,
    responseType: 'arraybuffer',
    signal: init?.signal ?? undefined,
    timeout: 20_000,
    transformResponse: [(data) => data],
  };

  const res = await axios.request<ArrayBuffer>(config);
  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(res.headers)) {
    if (value == null) continue;
    responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }

  const contentType = String(res.headers['content-type'] ?? '');
  const body = res.data;

  if (isTextLikeResponse(contentType, res.status)) {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(body));
    return new Response(text, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  }

  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

/**
 * Supabase용 fetch.
 * 1) 네이티브 fetch 시도 (iOS 26+ · 실기기 — 한글 정상)
 * 2) 실패 시 axios 폴백 (iOS 18.4 시뮬레이터)
 */
export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (Platform.OS !== 'web') {
    const native = await tryNativeFetch(input, init);
    if (native) return native;
  }

  try {
    return await axiosFetch(input, init);
  } catch (e) {
    if (__DEV__ && Platform.OS === 'ios') {
      console.warn('[supabaseFetch] axios fallback failed', toUrl(input), e);
    }
    throw e;
  }
}
