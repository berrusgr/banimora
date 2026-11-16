import type { AssetManifestEntry } from '../types/publishing.ts';
import type { AssetSourceProvider } from './assetResolver.ts';
import type { R2MediaClient } from './r2MediaClient.ts';

/**
 * AssetResolver için Cloudflare R2 imzalı okuma URL'si sağlayıcısı.
 * Yalnızca `storageType === 'cloud-r2'` ve `cloudObjectKey` bulunan kayıtları çözer.
 */
export class R2AssetSourceProvider implements AssetSourceProvider {
  readonly name = 'cloudflare-r2';
  private readonly client: Pick<R2MediaClient, 'signReadUrl'>;

  constructor(client: Pick<R2MediaClient, 'signReadUrl'>) {
    this.client = client;
  }

  canResolve(entry: AssetManifestEntry | undefined): boolean {
    return Boolean(
      entry &&
        entry.storageType === 'cloud-r2' &&
        typeof entry.cloudObjectKey === 'string' &&
        entry.cloudObjectKey.trim().length > 0
    );
  }

  async resolve(entry: AssetManifestEntry | undefined): Promise<string | undefined> {
    if (!entry?.cloudObjectKey) return undefined;
    const signed = await this.client.signReadUrl(entry.cloudObjectKey);
    return signed.url;
  }
}
