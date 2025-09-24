// Lightweight client for the NetEase proxy

const DEFAULT_BASE_URL = "http://103.40.14.239:12237";

export type MusicProxyOptions = {
  baseUrl?: string;
  musicU?: string; // MUSIC_U cookie value
  cookiesJsonPath?: string; // optional file path on server side (ignored here)
};

type SongUrlResp = { code: number; id: number; url: string | null };
type SearchResp = { code: number; count: number; songs: any[] };
type LyricResp = { code: number; id: number; lyric: string | null };

function buildHeaders(opts?: MusicProxyOptions): HeadersInit {
  const headers: Record<string, string> = { "accept": "application/json" };
  if (opts?.musicU) headers["music_u"] = opts.musicU;
  return headers;
}

export async function fetchSongUrl(
  id: number,
  opts?: MusicProxyOptions,
): Promise<string | null> {
  const base = opts?.baseUrl || DEFAULT_BASE_URL;
  const url = `${base}/song/url?id=${encodeURIComponent(String(id))}`;
  const res = await fetch(url, { headers: buildHeaders(opts) }).catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as SongUrlResp;
  if (data?.code !== 200) return null;
  return data.url || null;
}

export async function searchFirstSongId(
  keywords: string,
  opts?: MusicProxyOptions,
): Promise<number | null> {
  const base = opts?.baseUrl || DEFAULT_BASE_URL;
  const url = `${base}/search?keywords=${encodeURIComponent(keywords)}&limit=1`;
  const res = await fetch(url, { headers: buildHeaders(opts) }).catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as SearchResp;
  const id = data?.songs?.[0]?.id;
  return typeof id === "number" ? id : null;
}

export async function fetchLyric(
  id: number,
  opts?: MusicProxyOptions,
): Promise<string | null> {
  const base = opts?.baseUrl || DEFAULT_BASE_URL;
  const url = `${base}/lyric?id=${encodeURIComponent(String(id))}`;
  const res = await fetch(url, { headers: buildHeaders(opts) }).catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as LyricResp;
  if (data?.code !== 200) return null;
  return data.lyric || null;
}


