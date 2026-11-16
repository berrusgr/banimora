-- ============================================================================
-- Banimora Faz 5D (Adım 1): Paylaşılabilir Player MVP (published_watches)
-- ============================================================================
-- Güvenlik ve mimari ilkeler:
-- 1. İzleyiciye yalnızca tahmin edilmesi zor share_id üzerinden aktif ve
--    silinmemiş projeye ait yayın snapshot'ı (package_data) sunulur;
--    owner_id, project_id veya kullanıcı hesap bilgisi döndürülmez.
-- 2. anon rolüne tablo üzerinde doğrudan SELECT izni verilmez; yalnızca
--    get_published_watch_package(p_share_id) RPC'si ile tekil okuma açılır.
-- 3. published_watch_asset_links ile yayındaki paketlerin kullandığı medya
--    varlıkları proje düzenlemelerinden ve soft-delete işlemlerinden korunur.
-- ============================================================================

-- 1. published_watches tablosu (proje başına tek aktif/güncellenebilir kayıt)
CREATE TABLE IF NOT EXISTS public.published_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE
    REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id text NOT NULL UNIQUE
    CHECK (char_length(share_id) >= 24),
  title text NOT NULL
    CHECK (char_length(btrim(title)) > 0),
  package_data jsonb NOT NULL,
  source_revision integer NOT NULL DEFAULT 0
    CHECK (source_revision >= 0),
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_published_watches_share_active
  ON public.published_watches (share_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_published_watches_owner_updated
  ON public.published_watches (owner_id, updated_at DESC);

ALTER TABLE public.published_watches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.published_watches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_watches TO authenticated;

DROP POLICY IF EXISTS "published_watches_select_own" ON public.published_watches;
CREATE POLICY "published_watches_select_own"
  ON public.published_watches FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- 2. published_watch_asset_links tablosu (yayınlanmış Player medya koruması)
CREATE TABLE IF NOT EXISTS public.published_watch_asset_links (
  watch_id uuid NOT NULL
    REFERENCES public.published_watches(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL
    REFERENCES public.media_assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (watch_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_published_watch_asset_links_asset_id
  ON public.published_watch_asset_links (asset_id);

ALTER TABLE public.published_watch_asset_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.published_watch_asset_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_watch_asset_links TO authenticated;

DROP POLICY IF EXISTS "published_watch_asset_links_select_own" ON public.published_watch_asset_links;
CREATE POLICY "published_watch_asset_links_select_own"
  ON public.published_watch_asset_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.published_watches w
      WHERE w.id = watch_id
        AND w.owner_id = auth.uid()
    )
  );

-- 3. Yayınlama / Yeniden Yayınlama RPC'si
CREATE OR REPLACE FUNCTION public.publish_watch_package(
  p_project_id uuid,
  p_title text,
  p_source_revision integer,
  p_package_data jsonb,
  p_asset_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS public.published_watches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_title text;
  v_sanitized_package jsonb;
  v_requested_ids uuid[];
  v_requested_count integer;
  v_owned_count integer;
  v_package_keys text[];
  v_asset_keys text[];
  v_invalid_r2_entry_count integer;
  v_existing_watch public.published_watches;
  v_existing_ids uuid[];
  v_lock_ids uuid[];
  v_removed_ids uuid[];
  v_share_id text;
  v_result public.published_watches;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Oturum açılmadan yayınlama yapılamaz.'
      USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PROJECT_ID: Geçerli proje kimliği zorunludur.'
      USING ERRCODE = '22023';
  END IF;

  v_title := btrim(COALESCE(p_title, ''));
  IF v_title = '' THEN
    RAISE EXCEPTION 'INVALID_TITLE: Yayın başlığı boş olamaz.'
      USING ERRCODE = '22023';
  END IF;

  IF p_source_revision IS NULL OR p_source_revision < 0 THEN
    RAISE EXCEPTION 'INVALID_REVISION: Kaynak revizyon sıfır veya pozitif olmalıdır.'
      USING ERRCODE = '22023';
  END IF;

  IF p_package_data IS NULL
    OR jsonb_typeof(p_package_data) <> 'object'
    OR COALESCE(p_package_data->>'format', '') <> 'banimora-published-package'
    OR jsonb_typeof(p_package_data->'scenes') <> 'array'
    OR jsonb_typeof(p_package_data->'assets') <> 'object'
  THEN
    RAISE EXCEPTION 'INVALID_PACKAGE: Geçerli yayın paketi ve asset manifesti zorunludur.'
      USING ERRCODE = '22023';
  END IF;

  -- Özel hesap/bulut alanları yanlışlıkla paket içinde gönderilmişse temizle
  v_sanitized_package := p_package_data - 'cloudMeta' - 'ownerId' - 'ownerEmail';

  PERFORM 1
  FROM public.projects p
  WHERE p.id = p_project_id
    AND p.owner_id = v_uid
    AND p.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Yayınlanacak proje bulunamadı veya erişim yetkiniz yok.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), ARRAY[]::uuid[])
  INTO v_requested_ids
  FROM unnest(COALESCE(p_asset_ids, ARRAY[]::uuid[])) AS x
  WHERE x IS NOT NULL;

  v_requested_count := COALESCE(array_length(v_requested_ids, 1), 0);

  SELECT *
  INTO v_existing_watch
  FROM public.published_watches w
  WHERE w.project_id = p_project_id
  FOR UPDATE;

  IF FOUND THEN
    SELECT COALESCE(array_agg(pwal.asset_id ORDER BY pwal.asset_id), ARRAY[]::uuid[])
    INTO v_existing_ids
    FROM public.published_watch_asset_links pwal
    WHERE pwal.watch_id = v_existing_watch.id;
  ELSE
    v_existing_ids := ARRAY[]::uuid[];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), ARRAY[]::uuid[])
  INTO v_lock_ids
  FROM unnest(v_existing_ids || v_requested_ids) AS x;

  IF COALESCE(array_length(v_lock_ids, 1), 0) > 0 THEN
    PERFORM ma.id
    FROM public.media_assets ma
    WHERE ma.id = ANY(v_lock_ids)
    ORDER BY ma.id
    FOR UPDATE;
  END IF;

  IF v_requested_count > 0 THEN
    SELECT count(*)::integer
    INTO v_owned_count
    FROM public.media_assets ma
    WHERE ma.id = ANY(v_requested_ids)
      AND ma.owner_id = v_uid;

    IF v_owned_count <> v_requested_count THEN
      RAISE EXCEPTION
        'FORBIDDEN_ASSET_LINK: Yalnızca size ait medya varlıkları yayına bağlanabilir.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Paketteki cloud-r2 kayıtları ile p_asset_ids arasındaki tam 1-1 eşleşmeyi doğrula
  SELECT count(*)::integer
  INTO v_invalid_r2_entry_count
  FROM jsonb_each(COALESCE(p_package_data->'assets'->'entries', '{}'::jsonb)) AS e(k, v)
  WHERE e.v->>'storageType' = 'cloud-r2'
    AND btrim(COALESCE(e.v->>'cloudObjectKey', '')) = '';

  IF v_invalid_r2_entry_count > 0 THEN
    RAISE EXCEPTION
      'INVALID_PACKAGE_ASSET: cloud-r2 türündeki her paket varlığında geçerli cloudObjectKey zorunludur.'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(
    array_agg(DISTINCT btrim(e.v->>'cloudObjectKey') ORDER BY btrim(e.v->>'cloudObjectKey')),
    ARRAY[]::text[]
  )
  INTO v_package_keys
  FROM jsonb_each(COALESCE(p_package_data->'assets'->'entries', '{}'::jsonb)) AS e(k, v)
  WHERE e.v->>'storageType' = 'cloud-r2';

  SELECT COALESCE(
    array_agg(DISTINCT ma.object_key ORDER BY ma.object_key),
    ARRAY[]::text[]
  )
  INTO v_asset_keys
  FROM public.media_assets ma
  WHERE ma.id = ANY(v_requested_ids)
    AND ma.owner_id = v_uid;

  IF v_asset_keys IS DISTINCT FROM v_package_keys THEN
    RAISE EXCEPTION
      'ASSET_MANIFEST_MISMATCH: Paketteki cloud-r2 medya anahtarları ile gönderilen asset ID listesi birebir eşleşmelidir.'
      USING ERRCODE = '22023';
  END IF;

  IF v_existing_watch.id IS NOT NULL THEN
    v_share_id := v_existing_watch.share_id;
  ELSE
    -- 122-bit CSPRNG UUID v4 tabanlı 32 karakterli tahmin edilemez paylaşım kimliği
    v_share_id := replace(gen_random_uuid()::text, '-', '');
  END IF;

  INSERT INTO public.published_watches (
    project_id,
    owner_id,
    share_id,
    title,
    package_data,
    source_revision,
    is_active,
    published_at,
    updated_at
  )
  VALUES (
    p_project_id,
    v_uid,
    v_share_id,
    v_title,
    v_sanitized_package,
    p_source_revision,
    true,
    now(),
    now()
  )
  ON CONFLICT (project_id)
  DO UPDATE SET
    title = EXCLUDED.title,
    package_data = EXCLUDED.package_data,
    source_revision = EXCLUDED.source_revision,
    is_active = true,
    published_at = now(),
    updated_at = now()
  RETURNING * INTO v_result;

  SELECT COALESCE(array_agg(pwal.asset_id), ARRAY[]::uuid[])
  INTO v_removed_ids
  FROM public.published_watch_asset_links pwal
  WHERE pwal.watch_id = v_result.id
    AND NOT (pwal.asset_id = ANY(v_requested_ids));

  DELETE FROM public.published_watch_asset_links pwal
  WHERE pwal.watch_id = v_result.id
    AND NOT (pwal.asset_id = ANY(v_requested_ids));

  IF v_requested_count > 0 THEN
    INSERT INTO public.published_watch_asset_links (watch_id, asset_id)
    SELECT v_result.id, aid
    FROM unnest(v_requested_ids) AS aid
    ON CONFLICT (watch_id, asset_id) DO NOTHING;

    UPDATE public.media_assets ma
    SET orphaned_at = NULL
    WHERE ma.id = ANY(v_requested_ids)
      AND ma.owner_id = v_uid
      AND ma.orphaned_at IS NOT NULL;
  END IF;

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
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.published_watch_asset_links pwal
        JOIN public.published_watches pw ON pw.id = pwal.watch_id
        JOIN public.projects pw_proj ON pw_proj.id = pw.project_id
        WHERE pwal.asset_id = ma.id
          AND pw.is_active = true
          AND pw_proj.deleted_at IS NULL
      );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_watch_package(uuid, text, integer, jsonb, uuid[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_watch_package(uuid, text, integer, jsonb, uuid[])
  TO authenticated;

-- 4. Paylaşımı Kapatma RPC'si
CREATE OR REPLACE FUNCTION public.unpublish_watch_package(
  p_project_id uuid
)
RETURNS public.published_watches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_result public.published_watches;
  v_candidate_ids uuid[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Oturum açılmadan paylaşım kapatılamaz.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.published_watches pw
  SET
    is_active = false,
    updated_at = now()
  WHERE pw.project_id = p_project_id
    AND pw.owner_id = v_uid
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Kapatılacak yayın kaydı bulunamadı.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT pwal.asset_id ORDER BY pwal.asset_id), ARRAY[]::uuid[])
  INTO v_candidate_ids
  FROM public.published_watch_asset_links pwal
  WHERE pwal.watch_id = v_result.id;

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
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.published_watch_asset_links pwal
        JOIN public.published_watches pw ON pw.id = pwal.watch_id
        JOIN public.projects pw_proj ON pw_proj.id = pw.project_id
        WHERE pwal.asset_id = ma.id
          AND pw.is_active = true
          AND pw_proj.deleted_at IS NULL
      );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.unpublish_watch_package(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpublish_watch_package(uuid)
  TO authenticated;

-- 5. Anonim İzleyici Okuma RPC'si (yalnızca share_id ile tekil okuma)
CREATE OR REPLACE FUNCTION public.get_published_watch_package(
  p_share_id text
)
RETURNS TABLE (
  share_id text,
  title text,
  published_at timestamptz,
  package_data jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    pw.share_id,
    pw.title,
    pw.published_at,
    pw.package_data
  FROM public.published_watches pw
  JOIN public.projects p ON p.id = pw.project_id
  WHERE pw.share_id = btrim(COALESCE(p_share_id, ''))
    AND pw.is_active = true
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_published_watch_package(text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_watch_package(text)
  TO anon, authenticated;

-- 6. Mevcut Orphan Kontrolünü Yayınlanan Paketleri Koruyacak Şekilde Güncelle
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

  IF COALESCE(array_length(v_lock_ids, 1), 0) > 0 THEN
    PERFORM ma.id
    FROM public.media_assets ma
    WHERE ma.id = ANY(v_lock_ids)
    ORDER BY ma.id
    FOR UPDATE;
  END IF;

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

  SELECT COALESCE(array_agg(pal.asset_id), ARRAY[]::uuid[])
  INTO v_removed_ids
  FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id
    AND NOT (pal.asset_id = ANY(v_requested_ids));

  DELETE FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id
    AND NOT (pal.asset_id = ANY(v_requested_ids));

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
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.published_watch_asset_links pwal
        JOIN public.published_watches pw ON pw.id = pwal.watch_id
        JOIN public.projects pw_proj ON pw_proj.id = pw.project_id
        WHERE pwal.asset_id = ma.id
          AND pw.is_active = true
          AND pw_proj.deleted_at IS NULL
      );
  END IF;

  SELECT count(*)::integer
  INTO v_linked_count
  FROM public.project_asset_links pal
  WHERE pal.project_id = p_project_id;

  RETURN v_linked_count;
END;
$$;

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
    UPDATE public.published_watches pw
    SET
      is_active = false,
      updated_at = now()
    WHERE pw.project_id = NEW.id
      AND pw.is_active = true;

    SELECT COALESCE(array_agg(DISTINCT aid ORDER BY aid), ARRAY[]::uuid[])
    INTO v_candidate_ids
    FROM (
      SELECT pal.asset_id AS aid
      FROM public.project_asset_links pal
      WHERE pal.project_id = NEW.id
      UNION
      SELECT pwal.asset_id AS aid
      FROM public.published_watch_asset_links pwal
      JOIN public.published_watches pw ON pw.id = pwal.watch_id
      WHERE pw.project_id = NEW.id
    ) combined;

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
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.published_watch_asset_links pwal
          JOIN public.published_watches pw ON pw.id = pwal.watch_id
          JOIN public.projects pw_proj ON pw_proj.id = pw.project_id
          WHERE pwal.asset_id = ma.id
            AND pw.is_active = true
            AND pw_proj.deleted_at IS NULL
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
