import type {
  AssetManifest,
  AssetManifestEntry,
  AssetResolver,
  BanimoraProjectFileV2,
  PublishedContentPackage,
} from '../types/publishing.ts';

export interface MissingAssetInfo {
  assetIdOrUri: string;
  reason: 'NOT_FOUND' | 'EMPTY_URI' | 'PROVIDER_ERROR';
  message: string;
  timestamp: string;
}

/**
 * Gelecekte IndexedDB (5A.5), Cloudflare R2 (5C) veya ZIP/SCORM paket içi (5E/5F)
 * medya sağlayıcılarının ekleneceği genişletilebilir kaynak adaptörü.
 */
export interface AssetSourceProvider {
  readonly name: string;
  canResolve(entry: AssetManifestEntry | undefined, assetIdOrUri: string): boolean;
  resolve(
    entry: AssetManifestEntry | undefined,
    assetIdOrUri: string
  ): Promise<Blob | string | undefined> | Blob | string | undefined;
}

export interface CreateAssetResolverOptions {
  manifest?: AssetManifest;
  inlineSources?: Record<string, string>;
  /** Verildiğinde paket veya proje içindeki mevcut DataURL/URL kaynakları otomatik indekslenir. */
  packageSource?: PublishedContentPackage | BanimoraProjectFileV2;
  externalProviders?: AssetSourceProvider[];
  /** true ise DataURL kaynakları için de Blob + ObjectURL üretir ve dispose() ile serbest bırakır. */
  preferObjectUrlForDataUrl?: boolean;
  onMissingAsset?: (info: MissingAssetInfo) => void;
}

const DIRECT_URL_PREFIXES = ['data:', 'blob:', 'http://', 'https://', '/', './', '../'];

function isDirectUrl(value: string): boolean {
  const trimmed = value.trim();
  return DIRECT_URL_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

function normalizeAssetLookupId(assetIdOrUri: string): string {
  const trimmed = assetIdOrUri.trim();
  if (trimmed.startsWith('banimora-asset://')) {
    return trimmed.slice('banimora-asset://'.length).trim();
  }
  return trimmed;
}

/**
 * DataURL metnini tarayıcı ve Node ortamında çalışacak biçimde Blob'a dönüştürür.
 */
export function dataUrlToBlob(dataUrl: string): Blob | undefined {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return undefined;
  }
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return undefined;

  const header = dataUrl.slice(5, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  const isBase64 = header.endsWith(';base64') || header.includes(';base64;');
  const mimeType = header.split(';')[0]?.trim() || 'application/octet-stream';

  try {
    if (isBase64) {
      if (typeof atob !== 'function') {
        return undefined;
      }
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    }

    const decoded = decodeURIComponent(payload);
    return new Blob([decoded], { type: mimeType });
  } catch {
    return undefined;
  }
}

/**
 * Bir PublishedContentPackage veya BanimoraProjectFileV2 içindeki mevcut medya URL'lerini
 * kopyalama yapmadan (referans haritası olarak) çıkarır.
 */
export function extractInlineAssetSources(
  source: PublishedContentPackage | BanimoraProjectFileV2
): Record<string, string> {
  const map: Record<string, string> = {};
  const add = (id: string | undefined, url: string | undefined) => {
    if (
      typeof id === 'string' &&
      id.trim() &&
      typeof url === 'string' &&
      url.trim() &&
      !url.trim().startsWith('banimora-asset://')
    ) {
      if (!map[id.trim()]) {
        map[id.trim()] = url;
      }
    }
  };

  for (const item of source.uploadedObjects ?? []) {
    add(item.id, item.imageUrl);
  }
  for (const item of source.customCharacters ?? []) {
    add(item.id, item.imageUrl);
    const charKey = item.customKey?.trim() || item.id?.trim();
    if (charKey) {
      add(`photo:custom-char:${charKey}`, item.characterConfig?.photoAvatarUrl);
      add(`lipsync:custom-char:${charKey}`, item.characterConfig?.lipSyncAudioUrl);
    }
  }
  for (const bg of source.customBackgrounds ?? []) {
    add(bg.id, bg.imageUrl);
  }
  for (const clip of source.customAudioClips ?? []) {
    add(clip.id, clip.audioUrl);
  }

  for (const scene of source.scenes ?? []) {
    add(scene.background?.id, scene.background?.imageUrl);
    for (const clip of scene.audioClips ?? []) {
      add(clip.id, clip.audioUrl);
    }
    for (const obj of scene.objects ?? []) {
      const objAssetKey = obj.assetId || obj.id;
      add(objAssetKey, obj.imageUrl);
      if (obj.id) {
        add(`photo:obj:${obj.id}`, obj.characterConfig?.photoAvatarUrl);
        add(`lipsync:obj:${obj.id}`, obj.characterConfig?.lipSyncAudioUrl);
      }
    }
  }

  return map;
}

/**
 * Tekrarlı çözümlemeyi önleyen, eksik medyaları kontrollü raporlayan ve
 * oluşturulan Object URL yaşam döngüsünü yöneten AssetResolver uygulaması.
 */
export class DefaultAssetResolver implements AssetResolver {
  private readonly manifest?: AssetManifest;
  private readonly inlineSources: Record<string, string>;
  private readonly externalProviders: AssetSourceProvider[];
  private readonly preferObjectUrlForDataUrl: boolean;
  private readonly onMissingAsset?: (info: MissingAssetInfo) => void;

  private readonly resolvedUrlCache = new Map<string, string>();
  private readonly resolvedBlobCache = new Map<string, Blob>();
  private readonly pendingUrlResolutions = new Map<string, Promise<string | undefined>>();
  private readonly pendingBlobResolutions = new Map<string, Promise<Blob | undefined>>();
  private readonly createdObjectUrls = new Set<string>();
  private readonly missingAssets = new Map<string, MissingAssetInfo>();
  private disposed = false;

  constructor(options: CreateAssetResolverOptions = {}) {
    const extracted = options.packageSource
      ? extractInlineAssetSources(options.packageSource)
      : {};

    this.manifest =
      options.manifest ??
      (options.packageSource
        ? options.packageSource.format === 'banimora-published-package'
          ? options.packageSource.assets
          : options.packageSource.assetManifest
        : undefined);
    this.inlineSources = { ...extracted, ...(options.inlineSources ?? {}) };
    this.externalProviders = [...(options.externalProviders ?? [])];
    this.preferObjectUrlForDataUrl = Boolean(options.preferObjectUrlForDataUrl);
    this.onMissingAsset = options.onMissingAsset;
  }

  private recordMissing(
    assetIdOrUri: string,
    reason: MissingAssetInfo['reason'],
    message: string
  ): void {
    const key = `${reason}:${assetIdOrUri}`;
    if (!this.missingAssets.has(key)) {
      const info: MissingAssetInfo = {
        assetIdOrUri,
        reason,
        message,
        timestamp: new Date().toISOString(),
      };
      this.missingAssets.set(key, info);
      this.onMissingAsset?.(info);
    }
  }

  private createTrackedObjectUrl(blob: Blob): string | undefined {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const objectUrl = URL.createObjectURL(blob);
      this.createdObjectUrls.add(objectUrl);
      return objectUrl;
    }
    return undefined;
  }

  private materializeUrlFromString(rawUrl: string): string | undefined {
    if (this.preferObjectUrlForDataUrl && rawUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(rawUrl);
      if (blob) {
        const objectUrl = this.createTrackedObjectUrl(blob);
        if (objectUrl) return objectUrl;
      }
    }
    return rawUrl;
  }

  async resolveUrl(
    assetIdOrUri: string,
    fallbackUrl?: string
  ): Promise<string | undefined> {
    if (this.disposed) return undefined;

    const rawInput = typeof assetIdOrUri === 'string' ? assetIdOrUri.trim() : '';
    if (!rawInput) {
      if (typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
        return this.resolveUrl(fallbackUrl);
      }
      this.recordMissing('(empty)', 'EMPTY_URI', 'Boş medya kimliği veya URI çözümlenemedi.');
      return undefined;
    }

    const cacheKey = normalizeAssetLookupId(rawInput);
    const cached = this.resolvedUrlCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.pendingUrlResolutions.get(cacheKey);
    if (pending) {
      return pending;
    }

    const task = (async (): Promise<string | undefined> => {
      // 1. Doğrudan URL (DataURL, BlobURL, HTTP(S), göreli yol)
      if (isDirectUrl(rawInput)) {
        const materialized = this.materializeUrlFromString(rawInput);
        if (materialized) {
          this.resolvedUrlCache.set(cacheKey, materialized);
          return materialized;
        }
      }

      // 2. Paket veya projeden gelen inline kaynak
      const inlineUrl = this.inlineSources[cacheKey];
      if (inlineUrl) {
        const materialized = this.materializeUrlFromString(inlineUrl);
        if (materialized) {
          this.resolvedUrlCache.set(cacheKey, materialized);
          return materialized;
        }
      }

      // 3. Genişletilebilir dış kaynak sağlayıcıları (IndexedDB, R2, paket içi ZIP)
      const entry = this.manifest?.entries[cacheKey];
      for (const provider of this.externalProviders) {
        if (!provider.canResolve(entry, cacheKey)) continue;
        try {
          const result = await provider.resolve(entry, cacheKey);
          if (typeof result === 'string' && result.trim()) {
            const materialized = this.materializeUrlFromString(result.trim());
            if (materialized) {
              this.resolvedUrlCache.set(cacheKey, materialized);
              return materialized;
            }
          } else if (typeof Blob !== 'undefined' && result instanceof Blob) {
            this.resolvedBlobCache.set(cacheKey, result);
            const objectUrl = this.createTrackedObjectUrl(result);
            if (objectUrl) {
              this.resolvedUrlCache.set(cacheKey, objectUrl);
              return objectUrl;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.recordMissing(
            cacheKey,
            'PROVIDER_ERROR',
            `Sağlayıcı (${provider.name}) medya çözümlemesinde hata verdi: ${msg}`
          );
        }
      }

      // 4. Fallback URL
      if (typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
        const materialized = this.materializeUrlFromString(fallbackUrl.trim());
        if (materialized) {
          this.resolvedUrlCache.set(cacheKey, materialized);
          return materialized;
        }
      }

      this.recordMissing(
        cacheKey,
        'NOT_FOUND',
        `Medya kaynağı bulunamadı: ${cacheKey}`
      );
      return undefined;
    })();

    this.pendingUrlResolutions.set(cacheKey, task);
    try {
      return await task;
    } finally {
      this.pendingUrlResolutions.delete(cacheKey);
    }
  }

  async resolveBlob(
    assetIdOrUri: string,
    fallbackUrl?: string
  ): Promise<Blob | undefined> {
    if (this.disposed) return undefined;

    const rawInput = typeof assetIdOrUri === 'string' ? assetIdOrUri.trim() : '';
    if (!rawInput) {
      if (typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
        return this.resolveBlob(fallbackUrl);
      }
      this.recordMissing('(empty)', 'EMPTY_URI', 'Boş medya kimliği Blob olarak çözümlenemedi.');
      return undefined;
    }

    const cacheKey = normalizeAssetLookupId(rawInput);
    const cachedBlob = this.resolvedBlobCache.get(cacheKey);
    if (cachedBlob) {
      return cachedBlob;
    }

    const pending = this.pendingBlobResolutions.get(cacheKey);
    if (pending) {
      return pending;
    }

    const task = (async (): Promise<Blob | undefined> => {
      const candidateDataUrl = rawInput.startsWith('data:')
        ? rawInput
        : this.inlineSources[cacheKey];

      if (candidateDataUrl && candidateDataUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(candidateDataUrl);
        if (blob) {
          this.resolvedBlobCache.set(cacheKey, blob);
          return blob;
        }
      }

      const entry = this.manifest?.entries[cacheKey];
      for (const provider of this.externalProviders) {
        if (!provider.canResolve(entry, cacheKey)) continue;
        try {
          const result = await provider.resolve(entry, cacheKey);
          if (typeof Blob !== 'undefined' && result instanceof Blob) {
            this.resolvedBlobCache.set(cacheKey, result);
            return result;
          }
          if (typeof result === 'string' && result.startsWith('data:')) {
            const blob = dataUrlToBlob(result);
            if (blob) {
              this.resolvedBlobCache.set(cacheKey, blob);
              return blob;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.recordMissing(
            cacheKey,
            'PROVIDER_ERROR',
            `Sağlayıcı (${provider.name}) Blob çözümlemesinde hata verdi: ${msg}`
          );
        }
      }

      if (typeof fallbackUrl === 'string' && fallbackUrl.trim().startsWith('data:')) {
        const blob = dataUrlToBlob(fallbackUrl.trim());
        if (blob) {
          this.resolvedBlobCache.set(cacheKey, blob);
          return blob;
        }
      }

      this.recordMissing(
        cacheKey,
        'NOT_FOUND',
        `Medya Blob verisi bulunamadı: ${cacheKey}`
      );
      return undefined;
    })();

    this.pendingBlobResolutions.set(cacheKey, task);
    try {
      return await task;
    } finally {
      this.pendingBlobResolutions.delete(cacheKey);
    }
  }

  async preloadAssets(manifest: AssetManifest): Promise<void> {
    if (this.disposed) return;
    const ids = Object.keys(manifest.entries ?? {});
    await Promise.all(ids.map((id) => this.resolveUrl(id)));
  }

  getMissingAssets(): MissingAssetInfo[] {
    return Array.from(this.missingAssets.values());
  }

  getCreatedObjectUrlCount(): number {
    return this.createdObjectUrls.size;
  }

  dispose(): void {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      for (const objectUrl of this.createdObjectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    }
    this.createdObjectUrls.clear();
    this.resolvedUrlCache.clear();
    this.resolvedBlobCache.clear();
    this.pendingUrlResolutions.clear();
    this.pendingBlobResolutions.clear();
    this.disposed = true;
  }
}

export function createAssetResolver(
  options: CreateAssetResolverOptions = {}
): DefaultAssetResolver {
  return new DefaultAssetResolver(options);
}

export interface IndexedDbAssetStoreReader {
  getAssetBlob(blobKey: string): Promise<Blob | null>;
}

/**
 * IndexedDB `assets` deposundaki Blob kayıtlarını AssetManifestEntry.localBlobKey
 * üzerinden çözen AssetSourceProvider adaptörü.
 */
export function createIndexedDbAssetProvider(
  reader: IndexedDbAssetStoreReader
): AssetSourceProvider {
  return {
    name: 'indexeddb',
    canResolve(entry, assetIdOrUri) {
      if (entry?.localBlobKey && entry.localBlobKey.trim().length > 0) {
        return true;
      }
      return assetIdOrUri.trim().startsWith('banimora-asset://') && Boolean(entry?.localBlobKey);
    },
    async resolve(entry) {
      const blobKey = entry?.localBlobKey?.trim();
      if (!blobKey) return undefined;
      const blob = await reader.getAssetBlob(blobKey);
      return blob ?? undefined;
    },
  };
}

export function createIndexedDbAssetResolver(
  packageSource: PublishedContentPackage | BanimoraProjectFileV2,
  reader: IndexedDbAssetStoreReader,
  options: Omit<CreateAssetResolverOptions, 'packageSource' | 'manifest'> = {}
): DefaultAssetResolver {
  const idbProvider = createIndexedDbAssetProvider(reader);
  const manifest =
    'assetManifest' in packageSource ? packageSource.assetManifest : packageSource.assets;
  return new DefaultAssetResolver({
    ...options,
    manifest,
    packageSource,
    externalProviders: [idbProvider, ...(options.externalProviders ?? [])],
  });
}
