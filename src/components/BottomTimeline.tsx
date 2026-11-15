import React from 'react';
import { AdaptiveTimeline, type AdaptiveTimelineProps } from './timeline/AdaptiveTimeline';

/**
 * Geriye dönük uyumluluk sarmalayıcısı: Tüm timeline işlevselliği
 * modüler `src/components/timeline/AdaptiveTimeline.tsx` üzerinden yürütülür.
 */
export const BottomTimeline: React.FC<AdaptiveTimelineProps> = (props) => {
  return <AdaptiveTimeline {...props} />;
};
