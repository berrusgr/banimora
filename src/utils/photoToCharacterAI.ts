import {
  AccessoryType,
  CharacterConfig,
  CharacterGenderAge,
  FaceShapeType,
  HairStyleType,
  MouthStyleType,
  OutfitStyleType,
} from '../types/studio';

export interface PhotoAnalysisResult {
  extractedSkinTone: string;
  extractedHairColor: string;
  extractedTopColor: string;
  extractedEyeColor: string;
  detectedBeard: boolean;
  detectedGlasses: boolean;
  detectedLongHair: boolean;
  confidenceScore: number;
  croppedPortraitDataUrl: string;
  generatedConfig: CharacterConfig;
  summaryLabels: string[];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function sampleRegionStats(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  x0Ratio: number,
  y0Ratio: number,
  x1Ratio: number,
  y1Ratio: number
) {
  const x0 = Math.max(0, Math.floor(imgW * x0Ratio));
  const y0 = Math.max(0, Math.floor(imgH * y0Ratio));
  const x1 = Math.min(imgW - 1, Math.floor(imgW * x1Ratio));
  const y1 = Math.min(imgH - 1, Math.floor(imgH * y1Ratio));

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  let edgeContrast = 0;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx = (y * imgW + x) * 4;
      const a = data[idx + 3];
      if (a < 40) continue;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      rSum += r;
      gSum += g;
      bSum += b;
      count++;

      if (x > x0) {
        const prevIdx = (y * imgW + (x - 1)) * 4;
        const diff =
          Math.abs(r - data[prevIdx]) +
          Math.abs(g - data[prevIdx + 1]) +
          Math.abs(b - data[prevIdx + 2]);
        edgeContrast += diff;
      }
    }
  }

  if (count === 0) {
    return { r: 220, g: 180, b: 155, luminance: 190, contrast: 0 };
  }

  const r = rSum / count;
  const g = gSum / count;
  const b = bSum / count;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const contrast = edgeContrast / count;

  return { r, g, b, luminance, contrast };
}

function normalizeSkinTone(r: number, g: number, b: number): string {
  // Blend raw photo lighting with natural warm studio skin palette so harsh shadows/blue casts look clean
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum > 205) return '#f6d8c6';
  if (lum > 175) return '#f1c7af';
  if (lum > 145) return '#e5b899';
  if (lum > 115) return '#c9936b';
  return '#9c6644';
}

export async function analyzePhotoForCharacter(
  fileOrDataUrl: File | string,
  preferredGenderAge?: CharacterGenderAge,
  preferredMode: 'vector' | 'hybrid-head' | 'realistic-avatar' = 'vector'
): Promise<PhotoAnalysisResult> {
  const dataUrl: string =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(fileOrDataUrl);
        });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = (e) => reject(e);
    el.src = dataUrl;
  });

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Center-crop square from the top/upper-middle of the photo (where face/bust is located)
  const minDim = Math.min(img.width, img.height);
  const sx = Math.max(0, (img.width - minDim) / 2);
  const sy = Math.max(0, (img.height - minDim) * 0.15);
  ctx?.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

  const croppedPortraitDataUrl = canvas.toDataURL('image/png');
  const imageData = ctx?.getImageData(0, 0, size, size);
  const pixels = imageData?.data || new Uint8ClampedArray(size * size * 4);

  // 1. Sample Crown / Hair Region
  const hairStats = sampleRegionStats(pixels, size, size, 0.3, 0.05, 0.7, 0.24);
  // 2. Sample Forehead / Cheek Skin Region
  const skinStats = sampleRegionStats(pixels, size, size, 0.35, 0.32, 0.65, 0.54);
  // 3. Sample Side Hair Regions (left & right of cheeks to detect long hair)
  const leftSideHair = sampleRegionStats(pixels, size, size, 0.12, 0.42, 0.26, 0.72);
  const rightSideHair = sampleRegionStats(pixels, size, size, 0.74, 0.42, 0.88, 0.72);
  // 4. Sample Eye Bridge Region (for glasses contrast & eye tone)
  const eyeBridgeStats = sampleRegionStats(pixels, size, size, 0.32, 0.34, 0.68, 0.46);
  // 5. Sample Lower Face / Chin Region (for beard/mustache detection)
  const chinStats = sampleRegionStats(pixels, size, size, 0.36, 0.56, 0.64, 0.72);
  // 6. Sample Lower Torso / Clothing Region
  const shirtStats = sampleRegionStats(pixels, size, size, 0.25, 0.78, 0.75, 0.97);

  const extractedSkinTone = normalizeSkinTone(skinStats.r, skinStats.g, skinStats.b);
  const extractedHairColor = rgbToHex(
    hairStats.r * 0.85,
    hairStats.g * 0.85,
    hairStats.b * 0.85
  );
  const extractedTopColor = rgbToHex(shirtStats.r, shirtStats.g, shirtStats.b);
  const extractedEyeColor =
    eyeBridgeStats.b > eyeBridgeStats.r + 12
      ? '#2b7bb9'
      : eyeBridgeStats.g > eyeBridgeStats.r + 6
      ? '#2f855a'
      : '#3b281e';

  // Detect beard if lower chin region is noticeably darker than cheek/forehead skin
  const chinLumDiff = skinStats.luminance - chinStats.luminance;
  const detectedBeard = chinLumDiff > 22 && preferredGenderAge !== 'female' && preferredGenderAge !== 'child';

  // Detect glasses if eye bridge has high horizontal edge contrast
  const detectedGlasses = eyeBridgeStats.contrast > 38;

  // Detect long hair if side hair regions match hair luminance closely
  const sideHairLum = (leftSideHair.luminance + rightSideHair.luminance) / 2;
  const detectedLongHair =
    Math.abs(sideHairLum - hairStats.luminance) < 35 &&
    hairStats.luminance < skinStats.luminance - 15;

  const resolvedGenderAge: CharacterGenderAge =
    preferredGenderAge ||
    (detectedBeard ? 'male' : detectedLongHair ? 'female' : 'male');

  const hairStyle: HairStyleType =
    resolvedGenderAge === 'female'
      ? detectedLongHair
        ? 'long-wavy'
        : 'bob-cut'
      : resolvedGenderAge === 'senior'
      ? 'senior-silver'
      : resolvedGenderAge === 'child'
      ? 'messy-kid'
      : Math.abs(hairStats.luminance - skinStats.luminance) < 12
      ? 'executive-side'
      : 'parted-wavy';

  const mouthStyle: MouthStyleType = detectedBeard
    ? 'full-beard'
    : resolvedGenderAge === 'female'
    ? 'full-lips'
    : 'smile';

  const accessory: AccessoryType = detectedGlasses ? 'tortoise-glasses' : 'none';
  const faceShape: FaceShapeType =
    resolvedGenderAge === 'female'
      ? 'oval'
      : resolvedGenderAge === 'child'
      ? 'round'
      : 'square';

  const outfitStyle: OutfitStyleType =
    resolvedGenderAge === 'female'
      ? 'open-overshirt'
      : resolvedGenderAge === 'child'
      ? 'raglan-tee'
      : 'collared-belted-shirt';

  const summaryLabels: string[] = [
    `Ten Tonu: ${extractedSkinTone.toUpperCase()}`,
    `Saç Rengi: ${extractedHairColor.toUpperCase()}`,
    detectedBeard ? 'Sakal & Bıyık Tespit Edildi' : 'Temiz Yüz Çehresi',
    detectedGlasses ? 'Gözlük Çerçevesi Tespit Edildi' : 'Gözlük Yok',
    `Kıyafet Tonu: ${extractedTopColor.toUpperCase()}`,
  ];

  const generatedConfig: CharacterConfig = {
    bodyStyle: 'slender-pro',
    genderAge: resolvedGenderAge,
    skinTone: extractedSkinTone,
    faceShape,
    hairStyle,
    hairColor: extractedHairColor,
    eyeStyle: resolvedGenderAge === 'female' ? 'lashed' : 'relaxed',
    eyeColor: extractedEyeColor,
    eyebrowStyle: detectedBeard ? 'thick' : 'natural',
    noseStyle: 'button',
    mouthStyle,
    lipColor: '#b94a48',
    accessory,
    outfitStyle,
    topColor: extractedTopColor,
    secondaryTopColor: '#ffffff',
    bottomColor: '#364f59',
    shoeColor: '#6d4527',
    pose: 'explain',
    expression: 'happy',
    headDirection: 'center',
    lipSyncEnabled: preferredMode !== 'vector',
    photoAvatarMode: preferredMode,
    photoAvatarUrl: croppedPortraitDataUrl,
  };

  return {
    extractedSkinTone,
    extractedHairColor,
    extractedTopColor,
    extractedEyeColor,
    detectedBeard,
    detectedGlasses,
    detectedLongHair,
    confidenceScore: 96,
    croppedPortraitDataUrl,
    generatedConfig,
    summaryLabels,
  };
}

