# Banimora Media Worker (`banimora-media-worker`)

Cloudflare R2 (`banimora-media`) özel (private) medya deposu için güvenli yükleme ve kısa ömürlü imzalı okuma Worker'ı.

## 1. R2 Bucket ve Binding Yapılandırması

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket** ile `banimora-media` adında bir bucket oluşturun (**Public Access** kapalı bırakılmalıdır).
2. `wrangler.toml` içindeki binding doğrudan şu şekilde bağlıdır:
   ```toml
   [[r2_buckets]]
   binding = "MEDIA_BUCKET"
   bucket_name = "banimora-media"
   ```
   Dashboard üzerinden manuel Worker oluşturursanız **Settings → Variables and Secrets → R2 Bucket Bindings** kısmından `MEDIA_BUCKET` adını `banimora-media` bucket'ına bağlayın.

## 2. Gerekli Worker Secret Değişkenleri

Aşağıdaki değerleri kesinlikle `wrangler.toml` veya Vite `.env` dosyalarına yazmayın; yalnızca Wrangler Secret veya Cloudflare Dashboard Secret olarak tanımlayın:

```bash
cd workers/banimora-media-worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put MEDIA_SIGNING_SECRET
```

- `SUPABASE_URL`: Supabase proje URL'si (`https://<ref>.supabase.co`).
- `SUPABASE_ANON_KEY`: Token doğrulamasını `/auth/v1/user` üzerinden çağırmak için Supabase anon/publishable key.
- `MEDIA_SIGNING_SECRET`: İmzalı okuma URL'leri için en az 32 baytlık rastgele HMAC gizli anahtarı (`openssl rand -hex 32`).

## 3. Ortam Değişkenleri (`[vars]`)

- `MAX_UPLOAD_BYTES`: Tek dosya üst sınırı (varsayılan `15728640` = 15 MB).
- `SIGNED_URL_TTL_SECONDS`: İmzalı okuma URL geçerlilik süresi (varsayılan `3600` = 1 saat).
- `ALLOWED_ORIGINS`: Virgülle ayrılmış izinli Banimora origin listesi.

## 4. Test ve Dağıtım

```bash
# Yerel tip kontrolü
npx tsc -p workers/banimora-media-worker/tsconfig.json --noEmit

# Worker birim testleri
node --test workers/banimora-media-worker/tests/worker.test.ts

# Canlıya dağıtım (hazır olduğunuzda)
cd workers/banimora-media-worker
npx wrangler deploy
```
