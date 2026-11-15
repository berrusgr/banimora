import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type {
  LibraryAssetItem,
  QuestionAssetRef,
  QuestionImageFit,
} from '../../types/studio';
import { LIBRARY_ITEMS, VectorAssetRenderer } from '../../data/libraryAssets';

export function resolveQuestionAssetItem(
  ref: QuestionAssetRef | undefined,
  uploadedObjects: LibraryAssetItem[]
): LibraryAssetItem | null {
  if (!ref?.assetId) return null;
  if (ref.source === 'uploaded') {
    return (
      uploadedObjects.find((o) => (o.customKey || o.id) === ref.assetId) ?? null
    );
  }
  return LIBRARY_ITEMS.find((o) => o.id === ref.assetId) ?? null;
}

export interface QuestionAssetPreviewProps {
  assetRef?: QuestionAssetRef;
  uploadedObjects: LibraryAssetItem[];
  fit?: QuestionImageFit;
  className?: string;
}

/**
 * Studio soru düzenleme modalı ve Öğrenci Oynatıcısı tarafından paylaşılan
 * salt okunur soru görseli önizleme bileşeni.
 */
export const QuestionAssetPreview: React.FC<QuestionAssetPreviewProps> = ({
  assetRef,
  uploadedObjects,
  fit = 'contain',
  className = 'w-full h-28',
}) => {
  if (!assetRef) return null;
  const item = resolveQuestionAssetItem(assetRef, uploadedObjects);

  if (!item) {
    return (
      <div
        className={`${className} rounded-lg border border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-[10px] text-slate-500 p-2`}
      >
        <ImageIcon className="w-4 h-4 mb-1 opacity-50" />
        <span>Görsel bulunamadı</span>
      </div>
    );
  }

  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={assetRef.alt || item.name}
        className={`${className} rounded-lg bg-slate-50 ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        }`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-lg bg-slate-50/70 flex items-center justify-center p-1.5 overflow-hidden`}
    >
      <div className="w-full h-full max-w-[140px] max-h-[110px]">
        <VectorAssetRenderer
          assetId={item.id}
          color={item.defaultColor}
          secondaryColor={item.defaultSecondaryColor}
          text={item.defaultText}
          fontSize={item.defaultFontSize}
          chartData={item.chartData}
          chartPalette={item.chartPalette}
          tableData={item.tableData}
        />
      </div>
    </div>
  );
};
