// @ts-expect-error Node 26 yerleşik node:test modülü
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:fs modülü
import fs from 'node:fs';
// @ts-expect-error Node 26 yerleşik node:path modülü
import path from 'node:path';
// @ts-expect-error Node 26 yerleşik node:url modülü
import { fileURLToPath } from 'node:url';
// @ts-expect-error Node 26 yerleşik node:module modülü
import { createRequire } from 'node:module';
// @ts-expect-error Node 26 yerleşik node:crypto modülü
import crypto from 'node:crypto';

import type { CharacterConfig, CharacterExpressionType, CharacterPoseType } from '../../types/studio.ts';
import type {
  CanonicalBoneId,
  EvaluatedRigRenderState,
  GroundCompensationMode,
  Matrix2D,
  RigAnimationLayerInput,
  RigEvaluationResult,
  TwoBoneArmIKSolution,
} from '../../types/rigStandard.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import {
  applyMatrixToPoint,
  distance2D,
  identityMatrix2D,
  multiplyMatrix2D,
  rotationAroundPointMatrix2D,
  rotationMatrix2D,
  scaleMatrix2D,
  solveTwoBoneArmIK,
  translationMatrix2D,
} from '../rigKinematics.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(projectRoot, 'package.json'));
const esbuild = req('esbuild');
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');

// Güncel ArticulatedCharacterRig.tsx bileşenini çalışma zamanında esbuild ile paketle ve yükle
const rigTsxPath = path.join(projectRoot, 'src/components/ArticulatedCharacterRig.tsx');
const currentBundlePath = path.join(projectRoot, 'node_modules/.cache/current_rig_bundle.mjs');
fs.mkdirSync(path.dirname(currentBundlePath), { recursive: true });

esbuild.buildSync({
  entryPoints: [rigTsxPath],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: currentBundlePath,
  external: ['react', 'react-dom', '@dicebear/core', '@dicebear/collection', 'lucide-react'],
  logLevel: 'silent',
});

const rigModule = await import(`file:///${currentBundlePath.replace(/\\/g, '/')}`);
const {
  ArticulatedCharacterRig,
  DEFAULT_CHARACTER_CONFIGS,
  resolveHybridRigAngles,
  evaluateCharacterRig,
} = rigModule as {
  ArticulatedCharacterRig: React.FC<{
    config: CharacterConfig;
    animTime?: number;
    portraitMode?: boolean;
    canonicalBoneAngles?: Partial<Record<CanonicalBoneId, number>>;
    autoLevelAnkles?: boolean;
    rigLayers?: RigAnimationLayerInput[];
    userJointOverrides?: Partial<Record<string, number>>;
    userBodyBobYOverride?: number;
    leftArmIK?: TwoBoneArmIKSolution;
    rightArmIK?: TwoBoneArmIKSolution;
    leftArmIKWeight?: number;
    rightArmIKWeight?: number;
    includePreservedWristInIKLayer?: boolean;
    groundCompensationMode?: GroundCompensationMode;
    evaluatedRig?: RigEvaluationResult;
    assetId?: string;
    onEvaluatedRigState?: (state: EvaluatedRigRenderState) => void;
    useLegacyRendererFallback?: boolean;
  }>;
  DEFAULT_CHARACTER_CONFIGS: Record<string, CharacterConfig>;
  resolveHybridRigAngles: (
    config: CharacterConfig,
    animTime: number,
    activeRigPoseSlot?: 'start' | 'target',
    showJointPins?: boolean
  ) => {
    headTilt: number;
    leftShoulder: number;
    leftElbow: number;
    leftWrist: number;
    rightShoulder: number;
    rightElbow: number;
    rightWrist: number;
    leftHip: number;
    leftKnee: number;
    rightHip: number;
    rightKnee: number;
    bodyBobY: number;
  };
  evaluateCharacterRig: typeof import('../rigEvaluator.ts').evaluateCharacterRig;
};

const baselinePath = path.join(__dirname, 'fixtures/legacyRendererBaseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const UPDATE_BASELINE = process.env.UPDATE_SVG_BASELINE === '1';

const ALL_21_POSES: CharacterPoseType[] = [
  'idle',
  'walk',
  'run',
  'sit',
  'stand-up',
  'wave',
  'clap',
  'point',
  'clipboard',
  'typing',
  'phone-call',
  'presentation',
  'surgery',
  'workout',
  'explain',
  'surprised',
  'idea-bulb',
  'cheer',
  'sad',
  'scared',
  'think',
];

function normalizeDynamicIds(svgMarkup: string): string {
  return svgMarkup
    .replace(/id="([^"]+)-top-(striped|plaid|polka)"/g, 'id="__PID__-top-$2"')
    .replace(/id="([^"]+)-bottom-(striped|plaid|polka)"/g, 'id="__PID__-bottom-$2"')
    .replace(/url\(#([^)]+)-top-(striped|plaid|polka)\)/g, 'url(#__PID__-top-$2)')
    .replace(/url\(#([^)]+)-bottom-(striped|plaid|polka)\)/g, 'url(#__PID__-bottom-$2)');
}

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

interface LeafTransformEntry {
  tag: string;
  sig: string;
  transformChain: string[];
}

function extractLeafTransformChains(svgMarkup: string): LeafTransformEntry[] {
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)([^>]*?)(\/?)>/g;
  const stack: Array<{ tag: string; transform: string | null }> = [];
  const leaves: LeafTransformEntry[] = [];
  const leafTags = new Set([
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polygon',
    'polyline',
    'image',
  ]);

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(svgMarkup)) !== null) {
    const full = match[0];
    const tag = match[1];
    const attrStr = match[2] || '';
    const selfClosing = match[3] === '/' || full.endsWith('/>');
    const isClosing = full.startsWith('</');

    if (isClosing) {
      if (stack.length > 0) stack.pop();
      continue;
    }

    const transformMatch = attrStr.match(/\btransform="([^"]*)"/);
    const transform = transformMatch ? transformMatch[1] : null;

    if (leafTags.has(tag)) {
      const chain = stack.map((s) => s.transform).filter((t): t is string => Boolean(t));
      if (transform) chain.push(transform);
      const dMatch = attrStr.match(/\bd="([^"]*)"/);
      const cxMatch = attrStr.match(/\bcx="([^"]*)"/);
      const cyMatch = attrStr.match(/\bcy="([^"]*)"/);
      const xMatch = attrStr.match(/\bx="([^"]*)"/);
      const yMatch = attrStr.match(/\by="([^"]*)"/);
      leaves.push({
        tag,
        sig: dMatch
          ? `d:${dMatch[1].slice(0, 32)}`
          : cxMatch
            ? `c:${cxMatch[1]},${cyMatch?.[1]}`
            : xMatch
              ? `xy:${xMatch[1]},${yMatch?.[1]}`
              : tag,
        transformChain: chain,
      });
    }

    if (!selfClosing) {
      stack.push({ tag, transform });
    }
  }
  return leaves;
}

/**
 * Bir SVG `transform="..."` özniteliğini 2D homojen matrise (`Matrix2D`) ayrıştırır.
 */
function parseSvgTransformStringToMatrix(transformStr: string): Matrix2D {
  let mat = identityMatrix2D();
  const opRegex = /(translate|scale|rotate)\s*\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = opRegex.exec(transformStr)) !== null) {
    const fn = m[1];
    const nums = m[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (fn === 'translate') {
      const tx = nums[0] || 0;
      const ty = nums.length > 1 ? nums[1] : 0;
      mat = multiplyMatrix2D(mat, translationMatrix2D(tx, ty));
    } else if (fn === 'scale') {
      const sx = nums[0] ?? 1;
      const sy = nums.length > 1 ? nums[1] : sx;
      mat = multiplyMatrix2D(mat, scaleMatrix2D(sx, sy));
    } else if (fn === 'rotate') {
      const deg = nums[0] || 0;
      if (nums.length >= 3) {
        mat = multiplyMatrix2D(
          mat,
          rotationAroundPointMatrix2D(deg, { x: nums[1], y: nums[2] })
        );
      } else {
        mat = multiplyMatrix2D(mat, rotationMatrix2D(deg));
      }
    }
  }
  return mat;
}

function composeLeafWorldMatrix(transformChain: string[]): Matrix2D {
  let world = identityMatrix2D();
  for (const t of transformChain) {
    world = multiplyMatrix2D(world, parseSvgTransformStringToMatrix(t));
  }
  return world;
}

/**
 * Sıfır açılı kanonik sarmalayıcı `<g data-canonical-bone="...">` veya `<g data-rig-...>`
 * etiketlerini soyarak saf legacy SVG eşdeğerini elde eder.
 */
function stripZeroAngleCanonicalWrappers(svgMarkup: string): string {
  // Açılış etiketlerini işaretle ve yığınla eşleşen kapanış etiketlerini temizle
  const tokenRegex = /<\/?g\b[^>]*>/g;
  const removals: Array<{ start: number; end: number }> = [];
  const stack: Array<{ removeOnClose: boolean }> = [];

  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(svgMarkup)) !== null) {
    const tagText = m[0];
    const start = m.index;
    const end = start + tagText.length;

    if (tagText.startsWith('</g')) {
      const top = stack.pop();
      if (top?.removeOnClose) {
        removals.push({ start, end });
      }
    } else if (!tagText.endsWith('/>')) {
      const isNoTransformCanonicalWrapper =
        /\bdata-(canonical-bone|rig-adapter|rig-group)="[^"]+"/.test(tagText) &&
        !/\btransform=/.test(tagText);
      if (isNoTransformCanonicalWrapper) {
        removals.push({ start, end });
        stack.push({ removeOnClose: true });
      } else {
        stack.push({ removeOnClose: false });
      }
    }
  }

  let out = svgMarkup;
  for (let i = removals.length - 1; i >= 0; i--) {
    const r = removals[i];
    out = out.slice(0, r.start) + out.slice(r.end);
  }
  // head-collar-base ve back-hair-collar-base üzerindeki data-rig-group özniteliğini de temizle
  out = out.replace(/ data-rig-group="(head-collar-base|back-hair-collar-base)"/g, '');
  return out;
}

describe('Faz 3B-1 — Değişiklik Öncesi Frozen Baseline Regresyonu (16 Karakter × 21 Poz × 2 Zaman + Varyantlar)', () => {
  it('16 karakter × 21 hazır poz × 2 animTime (0 ve 0.65) = 672 kombinasyonun tamamında sıfır açıda yaprak çizim düğümü sayısı, CTM dönüşüm zinciri ve soyulmuş SVG SHA-256 özeti %100 korunur', () => {
    const charIds = Object.keys(DEFAULT_CHARACTER_CONFIGS);
    assert.equal(charIds.length, 16);

    let verifiedCells = 0;

    for (const charId of charIds) {
      const baseConfig = DEFAULT_CHARACTER_CONFIGS[charId];
      for (const poseId of ALL_21_POSES) {
        const cfg: CharacterConfig = { ...baseConfig, pose: poseId };

        // 1. animTime = 0
        const svgT0 = normalizeDynamicIds(
          renderToStaticMarkup(React.createElement(ArticulatedCharacterRig, { config: cfg, animTime: 0 }))
        );
        const leavesT0 = extractLeafTransformChains(svgT0);
        const expT0 = baseline.matrix336_t0[charId][poseId];

        const strippedT0 = stripZeroAngleCanonicalWrappers(svgT0);
        if (UPDATE_BASELINE) {
          baseline.matrix336_t0[charId][poseId] = {
            leafCount: leavesT0.length,
            first12LeafChains: leavesT0.slice(0, 12),
            last8LeafChains: leavesT0.slice(-8),
            sha256: sha256(strippedT0),
          };
        } else {
          assert.equal(
            leavesT0.length,
            expT0.leafCount,
            `${charId}/${poseId} (t=0) yaprak eleman sayısı değişmemeli`
          );
          assert.deepEqual(
            leavesT0.slice(0, 12),
            expT0.first12LeafChains,
            `${charId}/${poseId} (t=0) ilk 12 yaprak transform zinciri birebir aynı olmalı`
          );
          assert.deepEqual(
            leavesT0.slice(-8),
            expT0.last8LeafChains,
            `${charId}/${poseId} (t=0) son 8 yaprak transform zinciri birebir aynı olmalı`
          );
          assert.equal(
            sha256(strippedT0),
            expT0.sha256,
            `${charId}/${poseId} (t=0) sıfır açılı kanonik sarmalayıcılar dışındaki tüm SVG metni bit-seviyesinde özdeş olmalı`
          );
        }

        // 2. animTime = 0.65
        const svgT065 = normalizeDynamicIds(
          renderToStaticMarkup(React.createElement(ArticulatedCharacterRig, { config: cfg, animTime: 0.65 }))
        );
        const leavesT065 = extractLeafTransformChains(svgT065);
        const expT065 = baseline.matrix336_t065[charId][poseId];
        const strippedT065 = stripZeroAngleCanonicalWrappers(svgT065);
        if (UPDATE_BASELINE) {
          baseline.matrix336_t065[charId][poseId] = {
            leafCount: leavesT065.length,
            first12LeafChains: leavesT065.slice(0, 12),
            last8LeafChains: leavesT065.slice(-8),
            sha256: sha256(strippedT065),
          };
        } else {
          assert.equal(
            leavesT065.length,
            expT065.leafCount,
            `${charId}/${poseId} (t=0.65) yaprak eleman sayısı değişmemeli`
          );
          assert.equal(
            sha256(strippedT065),
            expT065.sha256,
            `${charId}/${poseId} (t=0.65) sıfır açılı kanonik sarmalayıcılar dışındaki tüm SVG metni bit-seviyesinde özdeş olmalı`
          );
        }

        verifiedCells += 2;
      }
    }

    assert.equal(verifiedCells, 672);
  });

  it('16 karakter için Speech/LipSync (AÇIK/KAPALI), PortraitMode (AÇIK/KAPALI) ve DiceBear/Vektör Kafa (center/left/right) varyantlarının tamamında baseline ile %100 eşleşir', () => {
    const charIds = Object.keys(DEFAULT_CHARACTER_CONFIGS);

    for (const charId of charIds) {
      const baseConfig = DEFAULT_CHARACTER_CONFIGS[charId];

      // Speech ON / OFF
      const cfgSpeechOn: CharacterConfig = {
        ...baseConfig,
        pose: 'explain',
        lipSyncEnabled: true,
        ttsScript: 'Merhaba arkadaşlar bugün konumuz matematik.',
      };
      const cfgSpeechOff: CharacterConfig = {
        ...baseConfig,
        pose: 'explain',
        lipSyncEnabled: false,
        ttsScript: 'Merhaba arkadaşlar bugün konumuz matematik.',
      };
      const svgOn = stripZeroAngleCanonicalWrappers(
        normalizeDynamicIds(
          renderToStaticMarkup(React.createElement(ArticulatedCharacterRig, { config: cfgSpeechOn, animTime: 0.45 }))
        )
      );
      const svgOff = stripZeroAngleCanonicalWrappers(
        normalizeDynamicIds(
          renderToStaticMarkup(React.createElement(ArticulatedCharacterRig, { config: cfgSpeechOff, animTime: 0.45 }))
        )
      );
      if (UPDATE_BASELINE) {
        baseline.speechLipSyncVariants[charId] = { onSha256: sha256(svgOn), offSha256: sha256(svgOff) };
      } else {
        assert.equal(sha256(svgOn), baseline.speechLipSyncVariants[charId].onSha256, `${charId} speechOn`);
        assert.equal(sha256(svgOff), baseline.speechLipSyncVariants[charId].offSha256, `${charId} speechOff`);
      }

      // Portrait ON / OFF
      const svgPortraitOn = stripZeroAngleCanonicalWrappers(
        normalizeDynamicIds(
          renderToStaticMarkup(
            React.createElement(ArticulatedCharacterRig, { config: baseConfig, animTime: 0, portraitMode: true })
          )
        )
      );
      const svgPortraitOff = stripZeroAngleCanonicalWrappers(
        normalizeDynamicIds(
          renderToStaticMarkup(
            React.createElement(ArticulatedCharacterRig, { config: baseConfig, animTime: 0, portraitMode: false })
          )
        )
      );
      if (UPDATE_BASELINE) {
        baseline.portraitModeVariants[charId] = {
          portraitOnSha256: sha256(svgPortraitOn),
          portraitOffSha256: sha256(svgPortraitOff),
        };
      } else {
        assert.equal(sha256(svgPortraitOn), baseline.portraitModeVariants[charId].portraitOnSha256, `${charId} portraitOn`);
        assert.equal(sha256(svgPortraitOff), baseline.portraitModeVariants[charId].portraitOffSha256, `${charId} portraitOff`);
      }

      // DiceBear vs Vector + headDirection center/left/right
      for (const useDb of [true, false]) {
        for (const dir of ['center', 'left', 'right'] as const) {
          const cfgVar: CharacterConfig = {
            ...baseConfig,
            useDicebearHead: useDb,
            headDirection: dir,
            pose: 'sad',
          };
          const svgVar = stripZeroAngleCanonicalWrappers(
            normalizeDynamicIds(
              renderToStaticMarkup(React.createElement(ArticulatedCharacterRig, { config: cfgVar, animTime: 0 }))
            )
          );
          const key = `${charId}__db_${useDb}__dir_${dir}__sad`;
          if (UPDATE_BASELINE) {
            baseline.vectorVsDicebearVariants[key] = { sha256: sha256(svgVar) };
          } else {
            assert.equal(sha256(svgVar), baseline.vectorVsDicebearVariants[key].sha256);
          }
        }
      }
    }
    if (UPDATE_BASELINE) {
      fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
    }
  });
});

describe('Faz 3B-1 — Aktif Pelvis -> Spine -> Chest -> Neck -> Head SVG Grupları ve Dönüşüm Doğrulaması', () => {
  it('slender-pro ve classic arketiplerinde pelvis, spine, chest, neck ve head açıları verildiğinde doğru SVG pivotlarıyla döndürür ve boyun meshini canonicalHeadAngle açısından izole tutar', () => {
    const slenderCfg = DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
    const classicChildCfg = DEFAULT_CHARACTER_CONFIGS['char-kid-can']; // sy = 0.72

    const activeAngles: Partial<Record<CanonicalBoneId, number>> = {
      pelvis: 6,
      spine: -8,
      chest: 10,
      neck: 9,
      head: -14,
    };

    // 1. Slender-Pro aktif SVG doğrulaması
    const slenderSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: slenderCfg,
        animTime: 0,
        canonicalBoneAngles: activeAngles,
      })
    );

    assert.ok(slenderSvg.includes('data-canonical-bone="pelvis" transform="rotate(6 104 168)"'));
    assert.ok(slenderSvg.includes('data-canonical-bone="spine" transform="rotate(-8 104 144)"'));
    assert.ok(slenderSvg.includes('data-canonical-bone="chest" transform="rotate(10 104 108)"'));
    assert.ok(slenderSvg.includes('data-canonical-bone="neck" transform="rotate(9 110 122)"'));
    assert.ok(slenderSvg.includes('data-canonical-bone="head" transform="rotate(-14 110 114)"'));

    // Boyun meshi (d="M100 98 L120 98 L118 126 Q110 130 102 126 Z") neck grubunun içinde olmalı
    // fakat head ("rotate(-14 110 114)") grubunun DIŞINDA olmalı!
    const slenderLeaves = extractLeafTransformChains(slenderSvg);
    const neckMeshLeaf = slenderLeaves.find((l) => l.sig.startsWith('d:M100 98 L120 98 L118 126'));
    assert.ok(neckMeshLeaf !== undefined, 'Slender boyun meshi yaprak düğümü bulunmalı');
    assert.ok(
      neckMeshLeaf!.transformChain.includes('rotate(9 110 122)'),
      'Boyun meshi neckAngle dönüşümünü almalı'
    );
    assert.ok(
      !neckMeshLeaf!.transformChain.includes('rotate(-14 110 114)'),
      'Boyun meshi kesinlikle canonicalHeadAngle (-14°) dönüşümünü ALMAMALI'
    );

    // 2. Classic Child (sy = 0.72) aktif SVG ve eşlenik pelvis pivotu doğrulaması
    const classicSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: classicChildCfg,
        animTime: 0,
        canonicalBoneAngles: activeAngles,
      })
    );

    const expectedUpperPelvisY = 157 + 45 / 0.72; // 219.5
    assert.ok(classicSvg.includes('data-rig-adapter="pelvis-lower" transform="rotate(6 110 202)"'));
    assert.ok(
      classicSvg.includes(
        `data-canonical-bone="pelvis" transform="rotate(6 110 ${expectedUpperPelvisY})"`
      )
    );
    assert.ok(classicSvg.includes('data-canonical-bone="spine" transform="rotate(-8 110 196)"'));
    assert.ok(classicSvg.includes('data-canonical-bone="chest" transform="rotate(10 110 155)"'));
    assert.ok(classicSvg.includes('data-canonical-bone="neck" transform="rotate(9 110 122)"'));
    assert.ok(classicSvg.includes('data-canonical-bone="head" transform="rotate(-14 110 114)"'));

    // Gerçek SVG'den ayrıştırılan alt gövde pelvis CTM'i ile üst gövde pelvis CTM'inin
    // aynı dünya noktası (ör. bel merkezi 110, 184.52) üzerinde özdeş etki ürettiğini doğrula
    const mLowerGroup = composeLeafWorldMatrix([
      'translate(110, 200) scale(0.76, 0.72) translate(-110, -200)',
      'rotate(6 110 202)',
    ]);
    const mUpperGroup = composeLeafWorldMatrix([
      'translate(110, 155) scale(0.76, 0.72) translate(-110, -155)',
      `rotate(6 110 ${expectedUpperPelvisY})`,
    ]);
    // Üst gövdedeki (110, 196) noktasının ölçeklenmiş karşılığı y = 155 + 41*0.72 = 184.52'dir;
    // Alt gövde ham uzayında bu nokta y = 200 + (184.52 - 200)/0.72 = 178.5'tir.
    const ptUpperWorld = applyMatrixToPoint(mUpperGroup, { x: 110, y: 196 });
    const ptLowerWorld = applyMatrixToPoint(mLowerGroup, { x: 110, y: 178.5 });
    assert.ok(distance2D(ptUpperWorld, ptLowerWorld) < 1e-11);
  });

  it('DiceBear uzun arka saç (H_back) ile ön kafa (H_front) SVG taşıyıcı zincirlerinin birleşik dönüşümlerde birebir aynı CTM matrisini ürettiğini doğrular', () => {
    const elvanCfg: CharacterConfig = {
      ...DEFAULT_CHARACTER_CONFIGS['char-pro-elvan'],
      useDicebearHead: true,
      headDirection: 'left',
      pose: 'sad',
      flipHorizontal: true,
    };

    const svg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: elvanCfg,
        animTime: 0.35,
        canonicalBoneAngles: {
          pelvis: 4,
          spine: -3,
          chest: 7,
          neck: 10,
          head: 12,
        },
      })
    );

    assert.ok(svg.includes('data-rig-group="back-hair-collar-base"'));
    assert.ok(svg.includes('data-rig-group="back-hair-neck-carrier" transform="rotate(10 110 122)"'));
    assert.ok(svg.includes('data-rig-group="back-hair-head-carrier" transform="rotate(12 110 114)"'));

    const leaves = extractLeafTransformChains(svg);
    // İlk yaprak gölge elipsinden sonraki ilk grup arka saç (H_back) içindeki path'tir
    const backHairLeaf = leaves[1];
    assert.ok(backHairLeaf, 'Arka saç yaprak düğümü bulunmalı');
    // H_back taşıyıcılarının ilk 4 dönüşümü (charRoot, collar-base, neck-carrier, head-carrier)
    const backCarrierChain = backHairLeaf.transformChain.slice(0, 4);

    // Ön kafa içindeki headTilt kemik tutamacı veya yüz/saç yaprağı aynı 4 dış taşıyıcı dönüşümü paylaşmalı
    const frontFaceLeaf = leaves.find(
      (l, idx) => idx > 5 && l.transformChain.includes('rotate(12 110 114)')
    );
    assert.ok(frontFaceLeaf !== undefined, 'Ön kafa yaprak düğümü bulunmalı');
    const frontCarrierChain = frontFaceLeaf!.transformChain.slice(0, 4);

    assert.deepEqual(
      backCarrierChain,
      frontCarrierChain,
      'H_back ve H_front dış taşıyıcı transform zincirleri birebir özdeş olmalı'
    );
  });

  it('useLegacyRendererFallback=true verildiğinde canonicalBoneAngles değerlerini yok sayarak sıfır açılı legacy davranışı korur', () => {
    const cfg = DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
    const svgFallback = normalizeDynamicIds(
      renderToStaticMarkup(
        React.createElement(ArticulatedCharacterRig, {
          config: cfg,
          animTime: 0,
          canonicalBoneAngles: {
            pelvis: 12,
            spine: 15,
            chest: -10,
            neck: 8,
            head: 20,
            leftAnkle: -25,
            rightAnkle: 30,
          },
          autoLevelAnkles: true,
          useLegacyRendererFallback: true,
        })
      )
    );
    const stripped = stripZeroAngleCanonicalWrappers(svgFallback);
    assert.equal(sha256(stripped), baseline.matrix336_t0['char-pro-sinan']['idle'].sha256);
  });
});

describe('Faz 3B-2 — Sol ve Sağ Ayak Bileği (leftAnkle, rightAnkle) SVG Grupları ve solveAnkleGroundLeveling Entegrasyonu', () => {
  it('autoLevelAnkles varsayılan olarak kapalıyken (false) yürüyüş/koşu/oturma pozlarında gereksiz rotate(0) üretmez ve eski ayakkabı pozlarını %100 korur', () => {
    for (const charId of ['char-pro-sinan', 'char-coach-emre', 'char-kid-can']) {
      for (const poseId of ['walk', 'run', 'sit'] as CharacterPoseType[]) {
        const cfg: CharacterConfig = { ...DEFAULT_CHARACTER_CONFIGS[charId], pose: poseId };
        const svgDefault = normalizeDynamicIds(
          renderToStaticMarkup(
            React.createElement(ArticulatedCharacterRig, {
              config: cfg,
              animTime: 0.65,
            })
          )
        );
        // autoLevelAnkles varsayılan false iken leftAnkle ve rightAnkle üzerinde transform bulunmamalı
        assert.ok(svgDefault.includes('<g data-canonical-bone="leftAnkle">'));
        assert.ok(svgDefault.includes('<g data-canonical-bone="rightAnkle">'));
        assert.equal(
          sha256(stripZeroAngleCanonicalWrappers(svgDefault)),
          baseline.matrix336_t065[charId][poseId].sha256
        );
      }
    }
  });

  it('autoLevelAnkles=true açıldığında slender-pro (89,312 / 118,312) ve classic (96,303 / 124,303) arketiplerinde iki ayağı birbirinden bağımsız olarak zemine paralel (toplam açı = 0°) tutar', () => {
    // 1. Slender-Pro (char-pro-sinan) walk pozu (t=0.65) + pelvis=4°
    const sinanWalkCfg: CharacterConfig = {
      ...DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
      pose: 'walk',
    };
    const sinanAngles = resolveHybridRigAngles(sinanWalkCfg, 0.65, 'start', false);
    const expectedSinanLeft = Math.max(
      -55,
      Math.min(55, Math.round(-(4 + sinanAngles.leftHip + sinanAngles.leftKnee) * 100) / 100)
    );
    const expectedSinanRight = Math.max(
      -55,
      Math.min(55, Math.round(-(4 + sinanAngles.rightHip + sinanAngles.rightKnee) * 100) / 100)
    );

    const sinanSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: sinanWalkCfg,
        animTime: 0.65,
        canonicalBoneAngles: { pelvis: 4 },
        autoLevelAnkles: true,
      })
    );

    assert.ok(
      sinanSvg.includes(
        `data-canonical-bone="leftAnkle" transform="rotate(${expectedSinanLeft} 89 312)"`
      ),
      `Slender sol bilek rotate(${expectedSinanLeft} 89 312) içermeli`
    );
    assert.ok(
      sinanSvg.includes(
        `data-canonical-bone="rightAnkle" transform="rotate(${expectedSinanRight} 118 312)"`
      ),
      `Slender sağ bilek rotate(${expectedSinanRight} 118 312) içermeli`
    );
    assert.notEqual(
      expectedSinanLeft,
      expectedSinanRight,
      'Yürüyüş pozunda sol ve sağ ayak bileği açıları birbirinden bağımsız ve farklı olmalı'
    );

    // 2. Classic Child (char-kid-can, sy=0.72) walk pozu (t=0.65) + pelvis=-5°
    const kidWalkCfg: CharacterConfig = {
      ...DEFAULT_CHARACTER_CONFIGS['char-kid-can'],
      pose: 'walk',
    };
    const kidAngles = resolveHybridRigAngles(kidWalkCfg, 0.65, 'start', false);
    const expectedKidLeft = Math.max(
      -55,
      Math.min(55, Math.round(-(-5 + kidAngles.leftHip + kidAngles.leftKnee) * 100) / 100)
    );
    const expectedKidRight = Math.max(
      -55,
      Math.min(55, Math.round(-(-5 + kidAngles.rightHip + kidAngles.rightKnee) * 100) / 100)
    );

    const kidSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: kidWalkCfg,
        animTime: 0.65,
        canonicalBoneAngles: { pelvis: -5 },
        autoLevelAnkles: true,
      })
    );

    assert.ok(
      kidSvg.includes(
        `data-canonical-bone="leftAnkle" transform="rotate(${expectedKidLeft} 96 303)"`
      ),
      `Classic sol bilek rotate(${expectedKidLeft} 96 303) içermeli`
    );
    assert.ok(
      kidSvg.includes(
        `data-canonical-bone="rightAnkle" transform="rotate(${expectedKidRight} 124 303)"`
      ),
      `Classic sağ bilek rotate(${expectedKidRight} 124 303) içermeli`
    );

    // Yaprak dönüşüm zincirinde diz dönüşümü ve ayak bileği dönüşümü yalnız birer kez yer almalı
    // ve alt bacak (shin) yaprağı ayak bileği dönüşümünü ALMAMALI!
    const kidLeaves = extractLeafTransformChains(kidSvg);
    const leftShinLeaf = kidLeaves.find((l) => l.sig.startsWith('d:M86 256 A10 10 0 0 1 106 256'));
    assert.ok(leftShinLeaf !== undefined, 'Classic sol alt bacak yaprağı bulunmalı');
    assert.ok(
      !leftShinLeaf!.transformChain.includes(`rotate(${expectedKidLeft} 96 303)`),
      'Alt bacak (shin) meshi kesinlikle leftAnkle dönüşümünü ALMAMALI'
    );

    const leftShoeLeaf = kidLeaves.find((l) =>
      l.transformChain.includes('translate(86, 303)')
    );
    assert.ok(leftShoeLeaf !== undefined, 'Classic sol ayakkabı yaprağı bulunmalı');
    assert.ok(
      leftShoeLeaf!.transformChain.includes(`rotate(${expectedKidLeft} 96 303)`),
      'Sol ayakkabı yaprağı leftAnkle dönüşümünü almalı'
    );
  });

  it('manuel leftAnkle/rightAnkle açıları için negatif, pozitif, sıfır ve [-55, +55] sınır kırpmalarını doğru uygular', () => {
    const emreCfg = DEFAULT_CHARACTER_CONFIGS['char-coach-emre'];

    // Sol bilek aşırı negatif (-85° -> -55°), sağ bilek aşırı pozitif (+90° -> +55°)
    const clampedSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: emreCfg,
        animTime: 0,
        canonicalBoneAngles: {
          leftAnkle: -85,
          rightAnkle: 90,
        },
      })
    );
    assert.ok(clampedSvg.includes('data-canonical-bone="leftAnkle" transform="rotate(-55 96 303)"'));
    assert.ok(clampedSvg.includes('data-canonical-bone="rightAnkle" transform="rotate(55 124 303)"'));

    // Sol bilek manuel 0° (transform üretilmemeli), sağ bilek manuel -18.5°
    const mixedSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: emreCfg,
        animTime: 0,
        canonicalBoneAngles: {
          leftAnkle: 0,
          rightAnkle: -18.5,
        },
      })
    );
    assert.ok(mixedSvg.includes('<g data-canonical-bone="leftAnkle">'));
    assert.ok(mixedSvg.includes('data-canonical-bone="rightAnkle" transform="rotate(-18.5 124 303)"'));
  });
});

describe('Faz 3B-3 — Rig Evaluator -> SVG Renderer Entegrasyonu (18 Kanonik Kemik, IK, Katmanlar, Kısmi Rig ve Lip-Sync)', () => {
  it('L0–L5 katmanlarından gelen 18 kanonik kemiğin tamamını slender-pro ve classic SVG gruplarına aktarır ve head açısını iki kez uygulamaz', () => {
    const full18Layer: RigAnimationLayerInput = {
      id: 'layer-18-bones',
      stage: 'L1_LOCOMOTION',
      mask: 'full',
      weight: 1,
      bodyBobY: -4,
      boneAngles: {
        pelvis: 5,
        spine: -6,
        chest: 8,
        neck: 7,
        head: -12,
        leftShoulder: 16,
        leftElbow: 22,
        leftWrist: -10,
        rightShoulder: -38,
        rightElbow: -48,
        rightWrist: 15,
        leftHip: -18,
        leftKnee: 30,
        leftAnkle: -12,
        rightHip: 14,
        rightKnee: 12,
        rightAnkle: -9,
      },
    };

    // 1. Slender-Pro (char-pro-sinan)
    let sinanState: EvaluatedRigRenderState | undefined;
    const sinanSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
        assetId: 'char-pro-sinan',
        animTime: 0,
        rigLayers: [full18Layer],
        onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
          sinanState = s;
        },
      })
    );

    assert.ok(sinanState);
    assert.equal(sinanState!.legacyHeadTiltDeg, 0, 'Katman head açısı yaka tabanına sızmamalı (çift dönüşüm yok)');
    assert.equal(sinanState!.canonicalHeadAngleDeg, -12);
    // torsoCumulativeAngleDeg = pelvis(5) + spine(-6) + chest(8) = +7°
    // head-collar-base üzerinde yalnızca torsoCumulativeAngleDeg (7°) olmalı; head (-12°) YALNIZCA data-canonical-bone="head" üzerinde olmalı!
    assert.ok(sinanSvg.includes('translate(0, -4)'));
    assert.ok(sinanSvg.includes('data-canonical-bone="pelvis" transform="rotate(5 104 168)"'));
    assert.ok(sinanSvg.includes('data-canonical-bone="spine" transform="rotate(-6 104 144)"'));
    assert.ok(sinanSvg.includes('data-canonical-bone="chest" transform="rotate(8 104 108)"'));
    assert.ok(sinanSvg.includes('data-canonical-bone="neck" transform="rotate(7 110 122)"'));
    assert.ok(sinanSvg.includes('data-canonical-bone="head" transform="rotate(-12 110 114)"'));
    assert.ok(sinanSvg.includes('rotate(7) translate(-110, -114)'));
    assert.ok(sinanSvg.includes('transform="rotate(16 75 80)"'));
    assert.ok(sinanSvg.includes('transform="rotate(22 74 118)"'));
    assert.ok(sinanSvg.includes('transform="rotate(-38 131 82)"'));
    assert.ok(sinanSvg.includes('transform="rotate(-48 133.5 118)"'));
    assert.ok(sinanSvg.includes('transform="rotate(-18 89 168)"'));
    assert.ok(sinanSvg.includes('transform="rotate(30 89 246)"'));
    assert.ok(sinanSvg.includes('data-canonical-bone="leftAnkle" transform="rotate(-12 89 312)"'));
    assert.ok(sinanSvg.includes('transform="rotate(14 119 168)"'));
    assert.ok(sinanSvg.includes('transform="rotate(12 118 246)"'));
    assert.ok(sinanSvg.includes('data-canonical-bone="rightAnkle" transform="rotate(-9 118 312)"'));

    // 2. Classic Child (char-kid-can, translateY=42, sy=0.72)
    let kidState: EvaluatedRigRenderState | undefined;
    const kidSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: DEFAULT_CHARACTER_CONFIGS['char-kid-can'],
        assetId: 'char-kid-can',
        animTime: 0,
        rigLayers: [full18Layer],
        onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
          kidState = s;
        },
      })
    );

    assert.ok(kidState);
    assert.equal(kidState!.legacyHeadTiltDeg, 0);
    assert.equal(kidState!.canonicalHeadAngleDeg, -12);
    // translateY(42) + bodyBobY(-4) = 38
    assert.ok(kidSvg.includes('translate(0, 38)'));
    assert.ok(kidSvg.includes('data-rig-adapter="pelvis-lower" transform="rotate(5 110 202)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="pelvis" transform="rotate(5 110 219.5)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="spine" transform="rotate(-6 110 196)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="chest" transform="rotate(8 110 155)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="neck" transform="rotate(7 110 122)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="head" transform="rotate(-12 110 114)"'));
    assert.ok(kidSvg.includes('transform="rotate(16 77 129)"'));
    assert.ok(kidSvg.includes('transform="rotate(22 77.5 166)"'));
    assert.ok(kidSvg.includes('transform="rotate(-38 143 129)"'));
    assert.ok(kidSvg.includes('transform="rotate(-48 142.5 166)"'));
    assert.ok(kidSvg.includes('transform="rotate(-18 96 202)"'));
    assert.ok(kidSvg.includes('transform="rotate(30 96 256)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="leftAnkle" transform="rotate(-12 96 303)"'));
    assert.ok(kidSvg.includes('transform="rotate(14 124 202)"'));
    assert.ok(kidSvg.includes('transform="rotate(12 124 256)"'));
    assert.ok(kidSvg.includes('data-canonical-bone="rightAnkle" transform="rotate(-9 124 303)"'));
  });

  it('2-kemikli kol IK (rightArmIK + spineAssist), L3 prosedürel kilidi ve L4 manuel override önceliğini SVG üzerinde doğrular', () => {
    const sinanCfg = DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
    const profile = buildCharacterRigProfile(sinanCfg, 'char-pro-sinan');

    const rightIK = solveTwoBoneArmIK({
      profile,
      side: 'right',
      targetPoint: { x: 162, y: 88 },
      targetSpace: 'raw-torso-svg',
      effectorKind: 'wrist-pivot',
      bendDirection: 'auto',
      allowSpineAssist: true,
    });

    // IK + L3 prosedürel katman (sağ kol IK tarafından kilitli olduğu için L3'ten etkilenmemeli)
    const svgIK = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: sinanCfg,
        assetId: 'char-pro-sinan',
        animTime: 0,
        rightArmIK: rightIK,
        rigLayers: [
          {
            id: 'procedural-arm-sway',
            stage: 'L3_PROCEDURAL',
            mask: 'both-arms',
            weight: 1,
            boneAngles: {
              leftShoulder: -11,
              rightShoulder: 30, // IK kilitlediği için uygulanmamalı
              rightElbow: 20, // IK kilitlediği için uygulanmamalı
            },
          },
        ],
      })
    );

    const baseSinanPose = resolveHybridRigAngles(sinanCfg, 0, 'start', false);
    const expectedRightShoulder = Math.round(rightIK.shoulderAngleDeg * 100) / 100;
    const expectedRightElbow = Math.round(rightIK.elbowAngleDeg * 100) / 100;
    const expectedLeftShoulder = baseSinanPose.leftShoulder + -11;

    assert.ok(
      svgIK.includes(`transform="rotate(${expectedRightShoulder} 131 82)"`),
      'Sağ omuz tam IK açısını almalı ve L3 prosedürel sallanmadan etkilenmemeli'
    );
    assert.ok(
      svgIK.includes(`transform="rotate(${expectedRightElbow} 133.5 118)"`),
      'Sağ dirsek tam IK açısını almalı ve L3 prosedürel sallanmadan etkilenmemeli'
    );
    assert.ok(
      svgIK.includes(`transform="rotate(${expectedLeftShoulder} 75 80)"`),
      `Sol omuz kilitsiz olduğu için temel poz (${baseSinanPose.leftShoulder}°) + L3 (-11°) = ${expectedLeftShoulder}° almalı`
    );

    // L4 manuel override (userJointOverrides) verildiğinde IK açısının üstüne yazmalı
    const svgManualOverride = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: sinanCfg,
        assetId: 'char-pro-sinan',
        animTime: 0,
        rightArmIK: rightIK,
        userJointOverrides: {
          rightElbow: -29,
        },
      })
    );
    assert.ok(
      svgManualOverride.includes(`transform="rotate(${expectedRightShoulder} 131 82)"`)
    );
    assert.ok(
      svgManualOverride.includes('transform="rotate(-29 133.5 118)"'),
      'L4 manuel dirsek açısı (-29°) IK dirsek açısını ezmeli'
    );
  });

  it('autoLevelAnkles ve manuel ayak bileği önceliğini ve groundCompensationMode dikey telafisini SVG üzerinde doğrular', () => {
    const emreCfg = DEFAULT_CHARACTER_CONFIGS['char-coach-emre'];
    let capturedState: EvaluatedRigRenderState | undefined;

    const svgCrouch = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: emreCfg,
        assetId: 'char-coach-emre',
        animTime: 0,
        autoLevelAnkles: true,
        groundCompensationMode: 'stance-lowest-foot',
        rigLayers: [
          {
            id: 'crouch-step',
            stage: 'L1_LOCOMOTION',
            mask: 'lower-body',
            weight: 1,
            boneAngles: {
              pelvis: 0,
              leftHip: -25,
              leftKnee: 50,
              rightHip: -25,
              rightKnee: 50,
            },
          },
        ],
        canonicalBoneAngles: {
          leftAnkle: -10, // Sol bilek manuel override (-10°), sağ bilek otomatik (-(-25+50) = -25°)
        },
        onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
          capturedState = s;
        },
      })
    );

    assert.ok(capturedState);
    assert.equal(capturedState!.svgBoneAngles.leftAnkle, -10);
    assert.equal(capturedState!.svgBoneAngles.rightAnkle, -25);
    assert.ok(capturedState!.bodyBobY > 5, 'Çömelmede pozitif groundCompensation bodyBobY üretilmeli');
    assert.ok(svgCrouch.includes('data-canonical-bone="leftAnkle" transform="rotate(-10 96 303)"'));
    assert.ok(svgCrouch.includes('data-canonical-bone="rightAnkle" transform="rotate(-25 124 303)"'));
    assert.ok(svgCrouch.includes(`translate(0, ${capturedState!.bodyBobY})`));
  });

  it('realistic-avatar kısmi rig profilinde ve desteklenmeyen char-robot-mira karakterinde güvenli davranışı korur', () => {
    // 1. realistic-avatar kısmi portre profili: gövde/kol/bacak hareketleri düşürülür, yalnız head açısı uygulanır
    const realisticCfg: CharacterConfig = {
      ...DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
      photoAvatarMode: 'realistic-avatar',
      photoAvatarUrl: 'https://example.com/presenter.png',
    };
    let realisticState: EvaluatedRigRenderState | undefined;
    const realisticSvg = renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: realisticCfg,
        animTime: 0,
        rigLayers: [
          {
            id: 'full-body-attempt',
            stage: 'L1_LOCOMOTION',
            mask: 'full',
            weight: 1,
            boneAngles: {
              head: 20,
              leftShoulder: -60,
              leftHip: 35,
            },
          },
        ],
        onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
          realisticState = s;
        },
      })
    );

    assert.ok(realisticState);
    assert.equal(realisticState!.evaluation.isSupported, true);
    assert.equal(realisticState!.canonicalHeadAngleDeg, 20);
    assert.equal(realisticState!.svgBoneAngles.leftShoulder, 0);
    assert.equal(realisticState!.svgBoneAngles.leftHip, 0);
    assert.ok(realisticState!.evaluation.droppedBoneMotions.length >= 2);
    // subtleTilt = 20 * 0.45 = 9°
    assert.ok(realisticSvg.includes('rotate(9 110 140)'));

    // 2. char-robot-mira desteklenmeyen karakter: tüm katmanlar güvenle reddedilir ve sıfır açılı çıktı döner
    let robotState: EvaluatedRigRenderState | undefined;
    renderToStaticMarkup(
      React.createElement(ArticulatedCharacterRig, {
        config: DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
        assetId: 'char-robot-mira',
        animTime: 0,
        rigLayers: [
          {
            id: 'robot-layer',
            stage: 'L1_LOCOMOTION',
            mask: 'full',
            weight: 1,
            boneAngles: {
              pelvis: 10,
              rightShoulder: -80,
            },
          },
        ],
        onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
          robotState = s;
        },
      })
    );

    assert.ok(robotState);
    assert.equal(robotState!.evaluation.isSupported, false);
    assert.equal(robotState!.svgBoneAngles.pelvis, 0);
    assert.equal(robotState!.svgBoneAngles.rightShoulder, 0);
  });

  it('lip-sync ağız hareketleri ile yüz ifadelerinin (expression) birbirini ezmediğini tüm kafa modlarında doğrular', () => {
    const expressions: CharacterExpressionType[] = ['neutral', 'happy', 'sad', 'surprised'];

    for (const useDicebearHead of [false, true]) {
      const baseCfg: CharacterConfig = {
        ...DEFAULT_CHARACTER_CONFIGS['char-coach-emre'],
        useDicebearHead,
        ttsScript: 'Merhaba arkadaşlar bugün harika bir ders işleyeceğiz.',
      };

      for (const expr of expressions) {
        let stateSilent: EvaluatedRigRenderState | undefined;
        let stateTalking: EvaluatedRigRenderState | undefined;

        const svgSilent = renderToStaticMarkup(
          React.createElement(ArticulatedCharacterRig, {
            config: { ...baseCfg, expression: expr, lipSyncEnabled: false },
            animTime: 0.45,
            onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
              stateSilent = s;
            },
          })
        );
        const svgTalking = renderToStaticMarkup(
          React.createElement(ArticulatedCharacterRig, {
            config: { ...baseCfg, expression: expr, lipSyncEnabled: true },
            animTime: 0.45,
            onEvaluatedRigState: (s: EvaluatedRigRenderState) => {
              stateTalking = s;
            },
          })
        );

        assert.equal(stateSilent!.expression, expr, `lipSync kapalıyken ifade '${expr}' korunmalı`);
        assert.equal(stateTalking!.expression, expr, `lipSync açıkken ifade '${expr}' ezilmemeli`);
        assert.notEqual(
          svgSilent,
          svgTalking,
          `lipSync açıldığında (${useDicebearHead ? 'DiceBear' : 'Vector'} / ${expr}) konuşma ağız/baş hareketi aktifleşmeli`
        );
      }

      // Aynı lipSync=true durumunda farklı ifadelerin (happy vs sad) kaş/göz/yüz geometrisi birbirinden farklı kalmalı!
      const svgTalkingHappy = renderToStaticMarkup(
        React.createElement(ArticulatedCharacterRig, {
          config: { ...baseCfg, expression: 'happy', lipSyncEnabled: true },
          animTime: 0.45,
        })
      );
      const svgTalkingSad = renderToStaticMarkup(
        React.createElement(ArticulatedCharacterRig, {
          config: { ...baseCfg, expression: 'sad', lipSyncEnabled: true },
          animTime: 0.45,
        })
      );
      assert.notEqual(
        svgTalkingHappy,
        svgTalkingSad,
        `lipSync açıkken bile 'happy' ve 'sad' ifadeleri (${useDicebearHead ? 'DiceBear' : 'Vector'}) birbirini ezmemeli`
      );
    }
  });
});


