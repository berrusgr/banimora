-- ============================================================================
-- Banimora Faz 3B.2: Supabase Medya Kayıt Sistemi (Cloudflare R2 Metadata)
-- ============================================================================
-- Güvenlik ve mimari ilkeler:
-- 1. Bu migration yalnızca R2 medya metadata kayıtlarını ve proje bağlantılarını
--    tutar; R2 nesnelerini silen hiçbir kod, RPC veya endpoint içermez.
-- 2. İstemci, banimora-media-worker POST /assets/upload başarılı yanıtından
--    dönen sha256, mime_type ve byte_size değerlerini register_media_asset
--    RPC'sine aktarır; owner_id ve object_key hiçbir zaman istemciden alınmaz.
-- 3. İleride yayınlama (Player paylaşım) sistemi eklendiğinde, yayınlanan
--    paketlerin kullandığı medya kayıtlarını bağımsız korumak için ayrı bir
--    referans tablosu (ör. published_watch_asset_links) kurulacaktır.
-- ============================================================================

-- 1. media_assets tablosu
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  sha256 text NOT NULL
    CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL
    CHECK (
      mime_type IN (
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/ogg',
        'audio/webm',
        'audio/mp4',
        'audio/aac'
      )
    ),
  byte_size bigint NOT NULL
    CHECK (byte_size > 0 AND byte_size <= 15728640),
  orphaned_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_owner_sha256_unique UNIQUE (owner_id, sha256)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_created
  ON public.media_assets (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_orphaned_at
  ON public.media_assets (orphaned_at)
  WHERE orphaned_at IS NOT NULL;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.media_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.media_assets TO authenticated;

DROP POLICY IF EXISTS "media_assets_select_own" ON public.media_assets;
CREATE POLICY "media_assets_select_own"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- 2. project_asset_links ilişki tablosu
CREATE TABLE IF NOT EXISTS public.project_asset_links (
  project_id uuid NOT NULL
    REFERENCES public.projects(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL
    REFERENCES public.media_assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_project_asset_links_asset_id
  ON public.project_asset_links (asset_id);

ALTER TABLE public.project_asset_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.project_asset_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.project_asset_links TO authenticated;

DROP POLICY IF EXISTS "project_asset_links_select_own" ON public.project_asset_links;
CREATE POLICY "project_asset_links_select_own"
  ON public.project_asset_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.owner_id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

-- 3. Medya Kayıt RPC'si (Idempotent SHA-256 Deduplication)
-- İstemciden yalnızca Worker'ın başarılı upload yanıtından gelen
-- sha256, mime_type ve byte_size alınır; owner_id ve object_key sunucuda üretilir.
CREATE OR REPLACE FUNCTION public.register_media_asset(
  p_sha256 text,
  p_mime_type text,
  p_byte_size bigint
)
RETURNS public.media_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_sha256 text;
  v_mime text;
  v_object_key text;
  v_result public.media_assets;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Oturum açılmadan medya kaydı oluşturulamaz.'
      USING ERRCODE = '42501';
  END IF;

  v_sha256 := lower(btrim(COALESCE(p_sha256, '')));
  IF v_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_SHA256: Geçerli 64 karakterli SHA-256 özeti zorunludur.'
      USING ERRCODE = '22023';
  END IF;

  v_mime := lower(btrim(split_part(COALESCE(p_mime_type, ''), ';', 1)));
  IF v_mime NOT IN (
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/aac'
  ) THEN
    RAISE EXCEPTION 'UNSUPPORTED_MEDIA_TYPE: İzin verilmeyen MIME türü.'
      USING ERRCODE = '22023';
  END IF;

  IF p_byte_size IS NULL OR p_byte_size <= 0 OR p_byte_size > 15728640 THEN
    RAISE EXCEPTION 'INVALID_BYTE_SIZE: Dosya boyutu 1 bayt ile 15 MB arasında olmalıdır.'
      USING ERRCODE = '22023';
  END IF;

  -- Worker'daki buildUserAssetObjectKey formatı ile birebir aynı sunucu anahtarı
  v_object_key := format('users/%s/assets/%s', v_uid::text, v_sha256);

  INSERT INTO public.media_assets (
    owner_id,
    sha256,
    object_key,
    mime_type,
    byte_size,
    orphaned_at
  )
  VALUES (
    v_uid,
    v_sha256,
    v_object_key,
    v_mime,
    p_byte_size,
    NULL
  )
  ON CONFLICT ON CONSTRAINT media_assets_owner_sha256_unique
  DO UPDATE SET
    orphaned_at = NULL
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.register_media_asset(text, text, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_media_asset(text, text, bigint)
  TO authenticated;

-- 4. Atomik Proje Medya Bağlantı Senkronizasyonu
-- Boş veya NULL p_asset_ids dizisi verildiğinde projedeki tüm medya bağlantıları
-- kaldırılır. Tüm aday media_assets satırları tutarlı id sırasıyla kilitlenir.
CREATE OR REPLACE FUNCTION public.sync_project_asset_links(
  p_project_id uuid,
  p_asset_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_requested_ids uuid[];
  v_requested_count integer;
  v_owned_count integer;
  v_existing_ids uuid[];
  v_lock_ids uuid[];
  v_removed_ids uuid[];
  v_linked_count integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Oturum açılmadan proje bağlantıları güncellenemez.'
      USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PROJECT_ID: Geçerli proje kimliği zorunludur.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.projects p
  WHERE p.id = p_project_id
    AND p.owner_id = v_uid
    AND p.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Proje bulunamadı veya erişim yetkiniz yok.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), ARRAY[]::uuid[])
  INTO v_requested_ids
  FROM unnest(COALESCE(p_asset_ids, ARRAY[]::uuid[])) AS x
  WHERE x IS NOT NULL;

  v_requested_count := COALESCE(array_length(v_requested_ids, 1), 0);

  SELECT COALESCE(array_agg(pal.asset_id ORDER BY pal.asset_id), ARRAY[]::uuid[])
  INTO v_existing_ids
  FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id;

  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), ARRAY[]::uuid[])
  INTO v_lock_ids
  FROM unnest(v_existing_ids || v_requested_ids) AS x;

  -- Eşzamanlı işlemlerde tutarlı sıra ile satır kilidi (deadlock ve yarış önleme)
  IF COALESCE(array_length(v_lock_ids, 1), 0) > 0 THEN
    PERFORM ma.id
    FROM public.media_assets ma
    WHERE ma.id = ANY(v_lock_ids)
    ORDER BY ma.id
    FOR UPDATE;
  END IF;

  -- Değişiklik öncesi tüm hedeflerin mevcut kullanıcıya ait olduğunu doğrula
  IF v_requested_count > 0 THEN
    SELECT count(*)::integer
    INTO v_owned_count
    FROM public.media_assets ma
    WHERE ma.id = ANY(v_requested_ids)
      AND ma.owner_id = v_uid;

    IF v_owned_count <> v_requested_count THEN
      RAISE EXCEPTION
        'FORBIDDEN_ASSET_LINK: Yalnızca size ait mevcut medya varlıkları projeye bağlanabilir.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Kaldırılacak bağlantıları belirle ve sil
  SELECT COALESCE(array_agg(pal.asset_id), ARRAY[]::uuid[])
  INTO v_removed_ids
  FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id
    AND NOT (pal.asset_id = ANY(v_requested_ids));

  DELETE FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id
    AND NOT (pal.asset_id = ANY(v_requested_ids));

  -- Yeni bağlantıları ekle
  IF v_requested_count > 0 THEN
    INSERT INTO public.project_asset_links (project_id, asset_id)
    SELECT p_project_id, aid
    FROM unnest(v_requested_ids) AS aid
    ON CONFLICT (project_id, asset_id) DO NOTHING;

    UPDATE public.media_assets ma
    SET orphaned_at = NULL
    WHERE ma.id = ANY(v_requested_ids)
      AND ma.owner_id = v_uid
      AND ma.orphaned_at IS NOT NULL;
  END IF;

  -- Son aktif proje bağlantısı kalktıysa orphaned_at işaretle
  IF COALESCE(array_length(v_removed_ids, 1), 0) > 0 THEN
    UPDATE public.media_assets ma
    SET orphaned_at = COALESCE(ma.orphaned_at, now())
    WHERE ma.id = ANY(v_removed_ids)
      AND ma.owner_id = v_uid
      AND NOT EXISTS (
        SELECT 1
        FROM public.project_asset_links pal
        JOIN public.projects p ON p.id = pal.project_id
        WHERE pal.asset_id = ma.id
          AND p.deleted_at IS NULL
      );
  END IF;

  SELECT count(*)::integer
  INTO v_linked_count
  FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id;

  RETURN v_linked_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_project_asset_links(uuid, uuid[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_project_asset_links(uuid, uuid[])
  TO authenticated;

-- 5. Soft-Delete Orphan Takip Tetikleyicisi
-- Mevcut soft_delete_project RPC'si deleted_at atadığında çalışır;
-- başka hiçbir aktif projeye bağlı olmayan medyaları orphaned_at ile işaretler.
CREATE OR REPLACE FUNCTION public.handle_project_soft_delete_media_orphans()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidate_ids uuid[];
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT COALESCE(array_agg(DISTINCT pal.asset_id ORDER BY pal.asset_id), ARRAY[]::uuid[])
    INTO v_candidate_ids
    FROM public.project_asset_links pal
    WHERE pal.project_id = NEW.id;

    IF COALESCE(array_length(v_candidate_ids, 1), 0) > 0 THEN
      PERFORM ma.id
      FROM public.media_assets ma
      WHERE ma.id = ANY(v_candidate_ids)
      ORDER BY ma.id
      FOR UPDATE;

      UPDATE public.media_assets ma
      SET orphaned_at = COALESCE(ma.orphaned_at, now())
      WHERE ma.id = ANY(v_candidate_ids)
        AND NOT EXISTS (
          SELECT 1
          FROM public.project_asset_links pal
          JOIN public.projects p ON p.id = pal.project_id
          WHERE pal.asset_id = ma.id
            AND p.deleted_at IS NULL
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_project_soft_delete_media_orphans()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_projects_soft_delete_orphan_assets ON public.projects;
CREATE TRIGGER trg_projects_soft_delete_orphan_assets
  AFTER UPDATE OF deleted_at ON public.projects
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_project_soft_delete_media_orphans();
