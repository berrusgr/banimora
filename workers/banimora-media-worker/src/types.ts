export interface R2ObjectMetaLike {
  key: string;
  size: number;
  httpMetadata?: {
    contentType?: string;
  };
}

export interface R2ObjectBodyLike extends R2ObjectMetaLike {
  body: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | null;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2BucketLike {
  head(key: string): Promise<R2ObjectMetaLike | null>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>,
    options?: {
      httpMetadata?: {
        contentType?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<R2ObjectMetaLike>;
}

export interface WorkerEnv {
  MEDIA_BUCKET: R2BucketLike;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  MEDIA_SIGNING_SECRET: string;
  MAX_UPLOAD_BYTES?: string;
  SIGNED_URL_TTL_SECONDS?: string;
  ALLOWED_ORIGINS?: string;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;
