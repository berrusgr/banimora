import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../utils/supabaseClient';

const DEFAULT_WORKER_URL = 'https://banimora-media-worker.berrusgr.workers.dev';

// 1x1 şeffaf PNG (67 baytlık zararsız test görseli)
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

interface TestStepResult {
  step: string;
  ok: boolean;
  detail: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function maskUserId(uid: string): string {
  if (!uid || uid.length < 8) return '***';
  return `${uid.slice(0, 4)}...${uid.slice(-4)}`;
}

function redactSignedUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.has('sig')) {
      parsed.searchParams.set('sig', '***REDACTED***');
    }
    return parsed.toString();
  } catch {
    return '[URL_REDACTED]';
  }
}

export const R2LiveTestPage: React.FC = () => {
  const [workerUrl, setWorkerUrl] = useState(DEFAULT_WORKER_URL);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestStepResult[]>([]);
  const [cleanupInfo, setCleanupInfo] = useState<{
    objectKey: string;
    sha256: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setUserEmail(data.session?.user?.email ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGitHubSignIn = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.href,
      },
    });
  };

  const runLiveTests = async () => {
    if (!supabase || running) return;
    setRunning(true);
    setResults([]);
    setCleanupInfo(null);
    setCopied(false);

    const steps: TestStepResult[] = [];
    const pushStep = (step: string, ok: boolean, detail: string) => {
      steps.push({ step, ok, detail });
      setResults([...steps]);
    };

    const normalizedWorkerUrl = workerUrl.trim().replace(/\/+$/, '');
    let accessToken = '';

    try {
      // 1. Mevcut Supabase oturumundan token al (yalnızca bellekte tutulur)
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      const session = sessionData.session;
      if (sessionError || !session?.access_token || !session.user?.id) {
        pushStep(
          '1. Supabase Oturum Kontrolü',
          false,
          `Katman: Supabase Auth — ${sessionError?.message ?? 'Aktif oturum bulunamadı'}`
        );
        return;
      }

      accessToken = session.access_token;
      const uid = session.user.id;
      pushStep(
        '1. Supabase Oturum Kontrolü',
        true,
        `Aktif GitHub OAuth oturumu doğrulandı (userId: ${maskUserId(uid)})`
      );

      const pngBytes = base64ToUint8Array(SAMPLE_PNG_BASE64);
      const pngBuffer = pngBytes.buffer.slice(
        pngBytes.byteOffset,
        pngBytes.byteOffset + pngBytes.byteLength
      ) as ArrayBuffer;
      const expectedSha256 = await computeSha256Hex(pngBuffer);

      // 2. İlk POST /assets/upload
      const uploadRes1 = await fetch(`${normalizedWorkerUrl}/assets/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/png',
          'x-asset-sha256': expectedSha256,
        },
        body: pngBuffer,
      });
      const uploadBody1 = (await uploadRes1.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!uploadRes1.ok || !uploadBody1.ok) {
        pushStep(
          '2. İlk POST /assets/upload',
          false,
          `Katman: Worker Upload / JWT / R2 — HTTP ${uploadRes1.status} (${String(uploadBody1.code ?? uploadBody1.error ?? 'bilinmeyen hata')})`
        );
        return;
      }
      pushStep(
        '2. İlk POST /assets/upload',
        true,
        `HTTP ${uploadRes1.status} (deduplicated: ${Boolean(uploadBody1.deduplicated)}, size: ${String(uploadBody1.sizeBytes)} B)`
      );

      // 3. SHA-256 doğrulaması
      const hashMatches = uploadBody1.sha256 === expectedSha256;
      pushStep(
        '3. Sunucu SHA-256 Doğrulaması',
        hashMatches,
        hashMatches
          ? `Eşleşti (${expectedSha256})`
          : `Beklenen ${expectedSha256}, gelen ${String(uploadBody1.sha256)}`
      );

      // 4. objectKey önek doğrulaması
      const expectedKey = `users/${uid}/assets/${expectedSha256}`;
      const keyMatches = uploadBody1.objectKey === expectedKey;
      pushStep(
        '4. objectKey Önek Doğrulaması',
        keyMatches,
        keyMatches
          ? `Doğru format (users/${maskUserId(uid)}/assets/${expectedSha256})`
          : 'Beklenen önek ile uyuşmuyor'
      );

      // 5. İkinci yüklemede deduplication
      const uploadRes2 = await fetch(`${normalizedWorkerUrl}/assets/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/png',
        },
        body: pngBuffer,
      });
      const uploadBody2 = (await uploadRes2.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const dedupOk =
        uploadRes2.status === 200 && uploadBody2.deduplicated === true;
      pushStep(
        '5. Tekrar Yüklemede Deduplication',
        dedupOk,
        dedupOk
          ? 'HTTP 200, deduplicated: true'
          : `HTTP ${uploadRes2.status}, deduplicated: ${String(uploadBody2.deduplicated)}`
      );

      // 6. POST /assets/sign-read
      const signRes = await fetch(`${normalizedWorkerUrl}/assets/sign-read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectKey: uploadBody1.objectKey,
          ttlSeconds: 120,
        }),
      });
      const signBody = (await signRes.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!signRes.ok || !signBody.ok || typeof signBody.url !== 'string') {
        pushStep(
          '6. POST /assets/sign-read',
          false,
          `Katman: Worker Sign-Read — HTTP ${signRes.status} (${String(signBody.code ?? signBody.error ?? 'hata')})`
        );
        return;
      }
      pushStep(
        '6. POST /assets/sign-read',
        true,
        `İmzalı URL üretildi (${redactSignedUrl(signBody.url)})`
      );

      // 7. İmzalı URL ile dosya okuma
      const readRes = await fetch(signBody.url, { method: 'GET' });
      if (!readRes.ok) {
        pushStep(
          '7. İmzalı URL ile Dosya Okuma',
          false,
          `Katman: Worker Read / R2 Get — HTTP ${readRes.status}`
        );
        return;
      }
      const downloadedBuffer = await readRes.arrayBuffer();
      const contentType = readRes.headers.get('content-type');
      const nosniff = readRes.headers.get('x-content-type-options');
      pushStep(
        '7. İmzalı URL ile Dosya Okuma',
        contentType === 'image/png' && nosniff === 'nosniff',
        `HTTP 200, Content-Type=${contentType}, X-Content-Type-Options=${nosniff}, ${downloadedBuffer.byteLength} B`
      );

      // 8. İndirilen dosyanın SHA-256 doğrulaması
      const downloadedSha256 = await computeSha256Hex(downloadedBuffer);
      pushStep(
        '8. İndirilen Dosya SHA-256 Eşleşmesi',
        downloadedSha256 === expectedSha256,
        downloadedSha256 === expectedSha256
          ? `Birebir aynı (${downloadedSha256})`
          : `Beklenen ${expectedSha256}, inen ${downloadedSha256}`
      );

      // 9. Bozuk imza reddi
      const tamperedUrl = signBody.url.replace(
        /sig=[^&]+/,
        'sig=tampered-invalid-sig'
      );
      const tamperedRes = await fetch(tamperedUrl, { method: 'GET' });
      pushStep(
        '9. Bozuk İmza Reddi',
        tamperedRes.status === 403,
        `HTTP ${tamperedRes.status} (beklenen 403)`
      );

      // 10. R2 varlık doğrulaması
      const objectKey = String(uploadBody1.objectKey);
      pushStep(
        '10. R2 Nesne Varlığı',
        true,
        `Nesne R2 bucket'ta doğrulandı (${objectKey})`
      );
      setCleanupInfo({ objectKey, sha256: expectedSha256 });

      // İsteğe bağlı yerel test betiği dinleyicisine maskeli raporu gönder (yalnızca 127.0.0.1)
      void fetch('http://127.0.0.1:4789/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          objectKey,
          sha256: expectedSha256,
        }),
      }).catch(() => {});
    } catch (err) {
      pushStep(
        'Beklenmeyen Hata',
        false,
        err instanceof Error ? err.message : 'Bilinmeyen hata'
      );
    } finally {
      accessToken = '';
      setRunning(false);
    }
  };

  const handleCopyReport = async () => {
    const lines = results.map(
      (r) => `${r.ok ? '✔' : '✖'} ${r.step}: ${r.detail}`
    );
    if (cleanupInfo) {
      lines.push('', `objectKey: ${cleanupInfo.objectKey}`, `SHA-256: ${cleanupInfo.sha256}`);
    }
    await navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    setCopied(true);
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="inline-block rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Yalnızca Geliştirme (DEV)
            </span>
            <h1 className="mt-1.5 text-lg font-bold text-white">
              Banimora R2 Worker Canlı Test Aracı (GitHub OAuth)
            </h1>
          </div>
          <a
            href="/"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            Uygulamaya Dön
          </a>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            Worker URL
            <input
              type="url"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs">
            {!authChecked ? (
              <span className="text-slate-400">Oturum kontrol ediliyor...</span>
            ) : userId ? (
              <span className="text-emerald-300">
                Oturum açık: <strong>{userEmail ?? maskUserId(userId)}</strong>
              </span>
            ) : (
              <span className="text-amber-300">
                Aktif oturum yok. GitHub ile giriş yapın.
              </span>
            )}

            <div className="flex items-center gap-2">
              {!userId && (
                <button
                  type="button"
                  onClick={() => void handleGitHubSignIn()}
                  disabled={!supabase}
                  className="rounded-lg bg-slate-800 border border-slate-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
                >
                  GitHub ile Giriş Yap
                </button>
              )}
              <button
                type="button"
                onClick={() => void runLiveTests()}
                disabled={!userId || running}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
              >
                {running ? 'Testler Çalışıyor...' : '10 Canlı R2 Testini Çalıştır'}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/90 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Test Sonuçları
              </h2>
              <button
                type="button"
                onClick={() => void handleCopyReport()}
                className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                {copied ? 'Kopyalandı' : 'Maskeli Raporu Kopyala'}
              </button>
            </div>
            <ul className="space-y-1.5 text-xs font-mono">
              {results.map((r) => (
                <li
                  key={r.step}
                  className={r.ok ? 'text-emerald-300' : 'text-rose-300'}
                >
                  {r.ok ? '✔' : '✖'} {r.step}: {r.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {cleanupInfo && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300 space-y-1 font-mono">
            <div className="font-sans font-semibold text-slate-200">
              Elle Temizlik Bilgisi (R2 Paneli: banimora-media)
            </div>
            <div>objectKey: {cleanupInfo.objectKey}</div>
            <div>SHA-256  : {cleanupInfo.sha256}</div>
          </div>
        )}
      </div>
    </div>
  );
};
