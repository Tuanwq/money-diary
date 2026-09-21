/** Memory-only, bounded cache; signed URLs still expire and remain private. */
export function createSignedPhotoCache(
  fetchUrls: (paths: string[]) => Promise<Map<string, string>>,
  now = Date.now,
) {
  const cache = new Map<string, { url: string; expires: number }>();
  const pending = new Map<string, Promise<string | undefined>>();
  return {
    invalidate(path: string) { cache.delete(path); },
    async get(paths: string[]) {
      const unique = [...new Set(paths)];
      const missing = unique.filter((path) => {
        const value = cache.get(path);
        if (value && value.expires <= now()) cache.delete(path);
        return !cache.has(path) && !pending.has(path);
      });
      if (missing.length) {
        const batch = fetchUrls(missing);
        for (const path of missing) {
          const request = batch.then((urls) => {
            const url = urls.get(path);
            if (url) {
              cache.set(path, { url, expires: now() + 50 * 60 * 1000 });
              while (cache.size > 256) cache.delete(cache.keys().next().value!);
            }
            return url;
          }).finally(() => pending.delete(path));
          pending.set(path, request);
        }
      }
      const values = await Promise.all(unique.map(async (path) =>
        [path, cache.get(path)?.url ?? await pending.get(path)] as const));
      return new Map(values.filter((item): item is readonly [string, string] => Boolean(item[1])));
    },
  };
}
