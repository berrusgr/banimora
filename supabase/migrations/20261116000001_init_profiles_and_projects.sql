
-- Banimora Faz 5B.2 — Profiles, Projects, Strict RLS,
-- Column Grants & Hardened SECURITY DEFINER RPCs

-- ============================================================================
-- 1. Updated-At Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 2. Profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile after Supabase Auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. Projects: Read-only direct access; writes only through RPC
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  mode text NOT NULL DEFAULT 'classic'
    CHECK (mode IN ('classic', 'addie')),
  scene_count integer NOT NULL DEFAULT 1 CHECK (scene_count >= 1),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  project_data jsonb NOT NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated
  ON public.projects (owner_id, updated_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.projects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.projects TO authenticated;

DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;

CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() AND deleted_at IS NULL);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. Controlled Project Save RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_project_with_revision(
  p_project_id uuid,
  p_project_name text,
  p_mode text,
  p_scene_count integer,
  p_project_data jsonb,
  p_expected_revision integer DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_result public.projects;
  v_existing_revision integer;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Oturum açılmadan buluta kayıt yapılamaz.'
      USING ERRCODE = '42501';
  END IF;

  IF p_expected_revision IS NULL OR p_expected_revision = 0 THEN
    BEGIN
      INSERT INTO public.projects (
        id, owner_id, project_name, mode, scene_count,
        revision, project_data, deleted_at
      )
      VALUES (
        p_project_id, v_uid, p_project_name, p_mode,
        GREATEST(1, COALESCE(p_scene_count, 1)),
        1, p_project_data, NULL
      )
      RETURNING * INTO v_result;

      RETURN v_result;

    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION
          'REVISION_CONFLICT: Proje zaten mevcut; güncelleme için beklenen revizyon gereklidir.'
          USING ERRCODE = '40001';
    END;
  END IF;

  UPDATE public.projects
  SET
    project_name = p_project_name,
    mode = p_mode,
    scene_count = GREATEST(1, COALESCE(p_scene_count, 1)),
    revision = revision + 1,
    project_data = p_project_data,
    updated_at = now()
  WHERE id = p_project_id
    AND owner_id = v_uid
    AND revision = p_expected_revision
    AND deleted_at IS NULL
  RETURNING * INTO v_result;

  IF FOUND THEN
    RETURN v_result;
  END IF;

  SELECT revision INTO v_existing_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = v_uid
    AND deleted_at IS NULL;

  IF FOUND THEN
    RAISE EXCEPTION
      'REVISION_CONFLICT: Beklenen revizyon (%), mevcut revizyon (%).',
      p_expected_revision, v_existing_revision
      USING ERRCODE = '40001';
  END IF;

  RAISE EXCEPTION
    'NOT_FOUND: Proje bulunamadı veya erişim yetkiniz yok.'
    USING ERRCODE = 'P0002';
END;
$$;

REVOKE ALL ON FUNCTION public.save_project_with_revision(
  uuid, text, text, integer, jsonb, integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_project_with_revision(
  uuid, text, text, integer, jsonb, integer
) TO authenticated;

-- ============================================================================
-- 5. Controlled Soft Delete RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_project(
  p_project_id uuid,
  p_expected_revision integer
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid;
  v_result public.projects;
  v_existing_revision integer;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Oturum açılmadan proje silinemez.'
      USING ERRCODE = '42501';
  END IF;

  IF p_expected_revision IS NULL OR p_expected_revision <= 0 THEN
    RAISE EXCEPTION
      'INVALID_REVISION: Silme işlemi için pozitif beklenen revizyon numarası zorunludur.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.projects
  SET
    deleted_at = now(),
    revision = revision + 1,
    updated_at = now()
  WHERE id = p_project_id
    AND owner_id = v_uid
    AND deleted_at IS NULL
    AND revision = p_expected_revision
  RETURNING * INTO v_result;

  IF FOUND THEN
    RETURN v_result;
  END IF;

  SELECT revision INTO v_existing_revision
  FROM public.projects
  WHERE id = p_project_id
    AND owner_id = v_uid
    AND deleted_at IS NULL;

  IF FOUND THEN
    RAISE EXCEPTION
      'REVISION_CONFLICT: Beklenen revizyon (%), mevcut revizyon (%).',
      p_expected_revision, v_existing_revision
      USING ERRCODE = '40001';
  END IF;

  RAISE EXCEPTION
    'NOT_FOUND: Proje bulunamadı veya erişim yetkiniz yok.'
    USING ERRCODE = 'P0002';
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_project(uuid, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.soft_delete_project(uuid, integer)
  TO authenticated;
