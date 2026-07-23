// Lightweight client-side IP → city/country lookup with localStorage cache.
// Uses ipapi.co's free JSON endpoint (no key, ~1k req/day per IP). We cache
// results for 7 days to avoid re-fetching for repeated IPs across renders.

export type IpGeo = {
  city: string | null;
  region: string | null;
  country: string | null; // human-readable name (e.g., "Bangladesh")
  country_code: string | null;
};

const CACHE_KEY = "aponjon_ipgeo_cache_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEntry = { at: number; geo: IpGeo | null };
type CacheMap = Record<string, CacheEntry>;

function readCache(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

function writeCache(map: CacheMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^fc|^fd/i.test(ip)) return true; // ULA IPv6
  return false;
}

const inflight = new Map<string, Promise<IpGeo | null>>();

export async function lookupIpGeo(ip: string): Promise<IpGeo | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const cache = readCache();
  const hit = cache[ip];
  if (hit && Date.now() - hit.at < TTL_MS) return hit.geo;

  if (inflight.has(ip)) return inflight.get(ip)!;

  const p = (async () => {
    try {
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const j = await res.json();
      if (j?.error) return null;
      const geo: IpGeo = {
        city: j.city || null,
        region: j.region || null,
        country: j.country_name || null,
        country_code: j.country_code || null,
      };
      const map = readCache();
      map[ip] = { at: Date.now(), geo };
      writeCache(map);
      return geo;
    } catch {
      return null;
    } finally {
      inflight.delete(ip);
    }
  })();

  inflight.set(ip, p);
  return p;
}

/** Country code → flag emoji (regional indicator letters). */
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  const cc = code.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - a), A + (cc.charCodeAt(1) - a));
}

export function formatIpGeoShort(geo: IpGeo | null): string {
  if (!geo) return "";
  const parts = [geo.city, geo.country].filter(Boolean);
  return parts.join(", ");
}
