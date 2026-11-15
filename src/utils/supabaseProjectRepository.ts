import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BanimoraProjectFileV2,
  ProjectCloudMeta,
  ProjectRepository,
  ProjectSummary,
} from '../types/publishing.ts';

export type CloudProjectMode = 'classic' | 'addie';
import {
  CloudRepositoryError,
  mapSupabaseErrorToCloudError,
} from './cloudRepositoryError.ts';
import { getSupabaseClient } from './supabaseClient.ts';

export const CLOUD_PAYLOAD_WARNING_BYTES = 15 * 1024 * 1024;
export const CLOUD_PAYLOAD_MAX_BYTES = 24 * 1024 * 1024;

export interface CloudProjectSummary extends ProjectSummary {
  mode?: CloudProjectMode;
}

export interface CloudPayloadCheckResult {
  byteLength: number;
  warningThresholdBytes: number;
  maxPayloadBytes: number;
  isWarning: boolean;
  exceedsLimit: boolean;
}

export interface CloudSaveProjectResult {
  project: BanimoraProjectFileV2;
  savedAt: string;
  cloudRevision: number;
  payloadBytes: number;
  payloadWarning: boolean;
}

export interface SupabaseProjectRow {
  id: string;
  owner_id: string;
  project_name: string;
  mode: CloudProjectMode;
  scene_count: number;
  revision: number;
  project_data?: BanimoraProjectFileV2;
  deleted_at?: string | null;
  created_at?: string;
  updated_at: string;
}

/**
 * SupabaseProjectRepository tarafından kullanılan salt-okunur SELECT + RPC istemci arayüzü.
 * Doğrudan tablo yazma metotları (insert/update/delete/upsert) sözleşmeye dahil edilmez.
 */
export interface SupabaseProjectsReadQuery {
  select(columns: string): SupabaseProjectsReadQuery;
  eq(column: string, value: unknown): SupabaseProjectsReadQuery;
  is(column: string, value: null | boolean): SupabaseProjectsReadQuery;
  order(
    column: string,
    options?: { ascending?: boolean }
  ): PromiseLike<{ data: unknown[] | null; error: unknown }>;
  maybeSingle(): PromiseLike<{ data: unknown | null; error: unknown }>;
}

export interface SupabaseCloudClientLike {
  auth: {
    getSession(): Promise<{
      data: { session: { user?: { id: string } | null } | null };
      error: unknown;
    }>;
  };
  from(table: string): SupabaseProjectsReadQuery;
  rpc(
    fn: string,
    params: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

export interface SupabaseProjectRepositoryOptions {
  client?: SupabaseClient | SupabaseCloudClientLike | null;
  warningThresholdBytes?: number;
  maxPayloadBytes?: number;
  onPayloadWarning?: (check: CloudPayloadCheckResult) => void;
  uuidGenerator?: () => string;
}

const utf8Encoder = new TextEncoder();

export function getUtf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).byteLength;
}

export function measureCloudRpcPayload(
  rpcParams: Record<string, unknown>,
  options?: {
    warningThresholdBytes?: number;
    maxPayloadBytes?: number;
  }
): CloudPayloadCheckResult {
  const warningThresholdBytes =
    options?.warningThresholdBytes ?? CLOUD_PAYLOAD_WARNING_BYTES;
  const maxPayloadBytes = options?.maxPayloadBytes ?? CLOUD_PAYLOAD_MAX_BYTES;
  const serialized = JSON.stringify(rpcParams);
  const byteLength = getUtf8ByteLength(serialized);

  return {
    byteLength,
    warningThresholdBytes,
    maxPayloadBytes,
    isWarning: byteLength >= warningThresholdBytes && byteLength <= maxPayloadBytes,
    exceedsLimit: byteLength > maxPayloadBytes,
  };
}

function generateUuidV4Fallback(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function defaultUuidGenerator(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return generateUuidV4Fallback();
}

function cloneProjectData<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildSyncedCloudMeta(row: SupabaseProjectRow): ProjectCloudMeta {
  return {
    projectId: row.id,
    ownerId: row.owner_id,
    revision: row.revision,
    lastSyncedAt: row.updated_at,
    syncState: 'synced',
  };
}

function resolveProjectMode(project: BanimoraProjectFileV2): CloudProjectMode {
  return project.educationalMetadata?.mode === 'addie' ? 'addie' : 'classic';
}

function hydrateProjectFromRow(
  row: SupabaseProjectRow,
  fallbackProject?: BanimoraProjectFileV2
): BanimoraProjectFileV2 {
  const source = row.project_data
    ? cloneProjectData(row.project_data)
    : fallbackProject
      ? cloneProjectData(fallbackProject)
      : null;

  if (!source) {
    throw new CloudRepositoryError(
      'VALIDATION_ERROR',
      'Bulut proje kaydında project_data içeriği eksik.'
    );
  }

  return {
    ...source,
    projectId: row.id,
    projectName: row.project_name,
    savedAt: row.updated_at || source.savedAt,
    cloudMeta: buildSyncedCloudMeta(row),
  };
}

/**
 * Supabase üzerinde yalnızca SELECT (RLS) ve SECURITY DEFINER RPC'ler üzerinden
 * çalışan bulut proje deposu. Doğrudan INSERT / UPDATE / DELETE sorgusu göndermez.
 */
export class SupabaseProjectRepository implements ProjectRepository {
  private readonly explicitClient: SupabaseCloudClientLike | null | undefined;
  private readonly warningThresholdBytes: number;
  private readonly maxPayloadBytes: number;
  private readonly onPayloadWarning?: (check: CloudPayloadCheckResult) => void;
  private readonly uuidGenerator: () => string;

  constructor(options: SupabaseProjectRepositoryOptions = {}) {
    this.explicitClient = options.client as SupabaseCloudClientLike | null | undefined;
    this.warningThresholdBytes =
      options.warningThresholdBytes ?? CLOUD_PAYLOAD_WARNING_BYTES;
    this.maxPayloadBytes = options.maxPayloadBytes ?? CLOUD_PAYLOAD_MAX_BYTES;
    this.onPayloadWarning = options.onPayloadWarning;
    this.uuidGenerator = options.uuidGenerator ?? defaultUuidGenerator;
  }

  private getClientOrThrow(): SupabaseCloudClientLike {
    const resolved =
      this.explicitClient !== undefined
        ? this.explicitClient
        : (getSupabaseClient() as unknown as SupabaseCloudClientLike | null);

    if (!resolved) {
      throw new CloudRepositoryError(
        'AUTH_REQUIRED',
        'Bulut deposu yapılandırılmamış veya oturum açılmamış.'
      );
    }
    return resolved;
  }

  private async requireUserId(): Promise<{
    client: SupabaseCloudClientLike;
    userId: string;
  }> {
    const client = this.getClientOrThrow();
    let sessionResult: Awaited<ReturnType<SupabaseCloudClientLike['auth']['getSession']>>;
    try {
      sessionResult = await client.auth.getSession();
    } catch (error) {
      throw mapSupabaseErrorToCloudError(error, 'Oturum bilgisi doğrulanamadı.');
    }

    if (sessionResult.error) {
      throw mapSupabaseErrorToCloudError(
        sessionResult.error,
        'Oturum bilgisi doğrulanamadı.'
      );
    }

    const userId = sessionResult.data?.session?.user?.id;
    if (!userId) {
      throw new CloudRepositoryError(
        'AUTH_REQUIRED',
        'Bulut proje işlemi için oturum açmanız gerekiyor.'
      );
    }

    return { client, userId };
  }

  async listProjects(): Promise<CloudProjectSummary[]> {
    const { client } = await this.requireUserId();

    let result: { data: unknown[] | null; error: unknown };
    try {
      result = await client
        .from('projects')
        .select('id, owner_id, project_name, mode, scene_count, revision, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
    } catch (error) {
      throw mapSupabaseErrorToCloudError(error, 'Bulut projeleri listelenemedi.');
    }

    if (result.error) {
      throw mapSupabaseErrorToCloudError(result.error, 'Bulut projeleri listelenemedi.');
    }

    const rows = (result.data ?? []) as SupabaseProjectRow[];
    return rows
      .filter((row) => row.deleted_at == null)
      .map((row) => ({
        projectId: row.id,
        projectName: row.project_name,
        updatedAt: row.updated_at,
        revision: row.revision,
        sceneCount: row.scene_count,
        syncState: 'synced' as const,
        mode: row.mode,
      }));
  }

  async loadProject(projectId: string): Promise<BanimoraProjectFileV2 | null> {
    const trimmedId = projectId.trim();
    if (!trimmedId) {
      throw new CloudRepositoryError('VALIDATION_ERROR', 'Proje kimliği boş olamaz.');
    }

    const { client } = await this.requireUserId();

    let result: { data: unknown | null; error: unknown };
    try {
      result = await client
        .from('projects')
        .select(
          'id, owner_id, project_name, mode, scene_count, revision, project_data, updated_at'
        )
        .eq('id', trimmedId)
        .is('deleted_at', null)
        .maybeSingle();
    } catch (error) {
      throw mapSupabaseErrorToCloudError(error, 'Bulut projesi yüklenemedi.');
    }

    if (result.error) {
      throw mapSupabaseErrorToCloudError(result.error, 'Bulut projesi yüklenemedi.');
    }

    if (!result.data) {
      return null;
    }

    const row = result.data as SupabaseProjectRow;
    if (row.deleted_at != null) {
      return null;
    }

    return hydrateProjectFromRow(row);
  }

  async saveProject(
    project: BanimoraProjectFileV2,
    expectedRevision?: number
  ): Promise<CloudSaveProjectResult> {
    const { client } = await this.requireUserId();

    const trimmedId = project.projectId.trim();
    const trimmedName = project.projectName.trim();
    if (!trimmedId || !trimmedName) {
      throw new CloudRepositoryError(
        'VALIDATION_ERROR',
        'Proje kimliği ve proje adı zorunludur.'
      );
    }

    const resolvedExpectedRevision =
      expectedRevision !== undefined
        ? expectedRevision
        : (project.cloudMeta?.revision ?? 0);

    if (
      !Number.isInteger(resolvedExpectedRevision) ||
      resolvedExpectedRevision < 0
    ) {
      throw new CloudRepositoryError(
        'VALIDATION_ERROR',
        'Beklenen bulut revizyonu 0 veya pozitif bir tam sayı olmalıdır.'
      );
    }

    // Medya referanslarını bozmadan proje verisini klonla; yerel IndexedDB'ye dokunma.
    const projectDataForCloud = cloneProjectData(project);
    const rpcParams: Record<string, unknown> = {
      p_project_id: trimmedId,
      p_project_name: trimmedName,
      p_mode: resolveProjectMode(project),
      p_scene_count: Math.max(1, project.scenes.length),
      p_project_data: projectDataForCloud,
      p_expected_revision: resolvedExpectedRevision,
    };

    const payloadCheck = measureCloudRpcPayload(rpcParams, {
      warningThresholdBytes: this.warningThresholdBytes,
      maxPayloadBytes: this.maxPayloadBytes,
    });

    if (payloadCheck.exceedsLimit) {
      throw new CloudRepositoryError(
        'PAYLOAD_TOO_LARGE',
        `Proje boyutu (${(payloadCheck.byteLength / (1024 * 1024)).toFixed(2)} MB) 24 MB bulut aktarım sınırını aşıyor.`,
        {
          byteLength: payloadCheck.byteLength,
          maxPayloadBytes: payloadCheck.maxPayloadBytes,
        }
      );
    }

    if (payloadCheck.isWarning) {
      this.onPayloadWarning?.(payloadCheck);
    }

    let rpcResult: { data: unknown; error: unknown };
    try {
      rpcResult = await client.rpc('save_project_with_revision', rpcParams);
    } catch (error) {
      throw mapSupabaseErrorToCloudError(error, 'Bulut projesi kaydedilemedi.');
    }

    if (rpcResult.error) {
      throw mapSupabaseErrorToCloudError(
        rpcResult.error,
        'Bulut projesi kaydedilemedi.'
      );
    }

    const row = Array.isArray(rpcResult.data)
      ? (rpcResult.data[0] as SupabaseProjectRow | undefined)
      : (rpcResult.data as SupabaseProjectRow | null);

    if (!row || typeof row.revision !== 'number') {
      throw new CloudRepositoryError(
        'UNKNOWN',
        'Sunucu save_project_with_revision dönüşü geçersiz.'
      );
    }

    const savedProject = hydrateProjectFromRow(row, projectDataForCloud);
    return {
      project: savedProject,
      savedAt: row.updated_at,
      cloudRevision: row.revision,
      payloadBytes: payloadCheck.byteLength,
      payloadWarning: payloadCheck.isWarning,
    };
  }

  async renameProject(
    projectId: string,
    nextName: string,
    expectedRevision?: number
  ): Promise<void> {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      throw new CloudRepositoryError('VALIDATION_ERROR', 'Proje adı boş olamaz.');
    }

    const existing = await this.loadProject(projectId);
    if (!existing) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Yeniden adlandırılacak bulut projesi bulunamadı.'
      );
    }

    const targetRevision =
      expectedRevision !== undefined
        ? expectedRevision
        : existing.cloudMeta?.revision;

    await this.saveProject(
      {
        ...existing,
        projectName: trimmedName,
      },
      targetRevision
    );
  }

  async duplicateProject(
    projectId: string,
    nextName?: string
  ): Promise<BanimoraProjectFileV2> {
    const source = await this.loadProject(projectId);
    if (!source) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Kopyalanacak bulut projesi bulunamadı.'
      );
    }

    const newProjectId = this.uuidGenerator();
    const resolvedName = (nextName ?? `${source.projectName} (Kopya)`).trim();
    const cloned = cloneProjectData(source);

    // Kaynak projenin cloud revision bilgisini yeni kopyaya taşıma.
    const projectForNewCloudRow: BanimoraProjectFileV2 = {
      ...cloned,
      projectId: newProjectId,
      projectName: resolvedName || `${source.projectName} (Kopya)`,
      savedAt: new Date().toISOString(),
      cloudMeta: {
        projectId: newProjectId,
        revision: 0,
        syncState: 'local-only',
      },
    };

    const saved = await this.saveProject(projectForNewCloudRow, 0);
    return saved.project;
  }

  async deleteProject(
    projectId: string,
    expectedRevision?: number
  ): Promise<void> {
    const trimmedId = projectId.trim();
    if (!trimmedId) {
      throw new CloudRepositoryError('VALIDATION_ERROR', 'Proje kimliği boş olamaz.');
    }

    const { client } = await this.requireUserId();

    let targetRevision = expectedRevision;
    if (targetRevision === undefined) {
      const existing = await this.loadProject(trimmedId);
      if (!existing || !existing.cloudMeta) {
        throw new CloudRepositoryError(
          'NOT_FOUND',
          'Silinecek bulut projesi bulunamadı.'
        );
      }
      targetRevision = existing.cloudMeta.revision;
    }

    let rpcResult: { data: unknown; error: unknown };
    try {
      rpcResult = await client.rpc('soft_delete_project', {
        p_project_id: trimmedId,
        p_expected_revision: targetRevision,
      });
    } catch (error) {
      throw mapSupabaseErrorToCloudError(error, 'Bulut projesi silinemedi.');
    }

    if (rpcResult.error) {
      throw mapSupabaseErrorToCloudError(
        rpcResult.error,
        'Bulut projesi silinemedi.'
      );
    }
  }
}
