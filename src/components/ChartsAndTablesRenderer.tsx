import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  ChartDataPoint,
  ChartPaletteId,
  LibraryAssetItem,
  TableDataConfig,
  VectorAssetId,
} from '../types/studio';

export const CHART_PALETTES: Record<
  ChartPaletteId,
  { label: string; colors: string[]; headerBg: string; softBg: string }
> = {
  corporate: {
    label: 'Kurumsal',
    colors: ['#1e40af', '#2563eb', '#0284c7', '#475569', '#0f766e'],
    headerBg: '#1e3a8a',
    softBg: '#eff6ff',
  },
  pastel: {
    label: 'Pastel',
    colors: ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'],
    headerBg: '#6366f1',
    softBg: '#f5f3ff',
  },
  vibrant: {
    label: 'Canlı Eğitim',
    colors: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
    headerBg: '#4f46e5',
    softBg: '#eef2ff',
  },
};

const STATIC_ANIM = {
  enter: { type: 'none' as const, duration: 0, delay: 0, easing: 'linear' as const },
  emphasis: { type: 'none' as const, duration: 2.0, delay: 0, easing: 'ease-in-out' as const },
  exit: { type: 'none' as const, duration: 0, delay: 0, easing: 'linear' as const },
};

const DEFAULT_CHART_SERIES: ChartDataPoint[] = [
  { label: '2023', value: 45 },
  { label: '2024', value: 72 },
  { label: '2025', value: 60 },
  { label: '2026', value: 94 },
];

const DEFAULT_PIE_SERIES: ChartDataPoint[] = [
  { label: 'Fen', value: 35 },
  { label: 'Matematik', value: 30 },
  { label: 'Türkçe', value: 20 },
  { label: 'Tarih', value: 15 },
];

export type ChartTableGroup = 'all' | 'charts' | 'tables';

export type ChartTableLibraryEntry = LibraryAssetItem & {
  chartGroup: 'charts' | 'tables';
};

export const CHART_TABLE_LIBRARY_ITEMS: ChartTableLibraryEntry[] = [
  {
    id: 'chart-bar',
    name: 'Sütun Grafiği',
    subtitle: 'Dikey Karşılaştırma',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 320,
    defaultHeight: 200,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#4f46e5',
    chartPalette: 'vibrant',
    chartData: DEFAULT_CHART_SERIES,
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'chart-hbar',
    name: 'Yatay Çubuk Grafiği',
    subtitle: 'Sıralama ve Oran',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 320,
    defaultHeight: 190,
    defaultColor: '#2563eb',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#2563eb',
    chartPalette: 'corporate',
    chartData: DEFAULT_CHART_SERIES,
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'chart-pie',
    name: 'Pasta Grafiği',
    subtitle: 'Yüzdelik Dilimler',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 260,
    defaultHeight: 200,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#ec4899',
    chartPalette: 'vibrant',
    chartData: DEFAULT_PIE_SERIES,
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'chart-donut',
    name: 'Halka Grafiği (Donut)',
    subtitle: 'Oransal Dağılım',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 260,
    defaultHeight: 200,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#8b5cf6',
    chartPalette: 'pastel',
    chartData: DEFAULT_PIE_SERIES,
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'chart-line',
    name: 'Çizgi Grafiği',
    subtitle: 'Zaman & Trend Eğrisi',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 320,
    defaultHeight: 195,
    defaultColor: '#0284c7',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#0284c7',
    chartPalette: 'corporate',
    chartData: DEFAULT_CHART_SERIES,
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'chart-progress',
    name: 'İlerleme Çubuğu',
    subtitle: 'Tekil Yüzde Gösterimi',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 300,
    defaultHeight: 96,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#10b981',
    chartPalette: 'vibrant',
    chartData: [{ label: 'Tamamlanma Oranı', value: 78 }],
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'chart-gauge',
    name: 'Dairesel Gösterge',
    subtitle: 'Radial Yüzde Ölçer',
    category: 'objects',
    chartGroup: 'charts',
    defaultWidth: 200,
    defaultHeight: 160,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#4f46e5',
    chartPalette: 'vibrant',
    chartData: [{ label: 'Başarı Puanı', value: 84 }],
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'table-classic-3x3',
    name: 'Veri Tablosu (3x3)',
    subtitle: 'Zebra Çizgili Tablo',
    category: 'objects',
    chartGroup: 'tables',
    defaultWidth: 340,
    defaultHeight: 170,
    defaultColor: '#1e3a8a',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#1e3a8a',
    chartPalette: 'corporate',
    tableData: {
      headers: ['Konu', 'Süre', 'Durum'],
      rows: [
        ['Giriş & Tanım', '5 dk', 'Hazır'],
        ['Örnek Çözüm', '10 dk', 'Aktif'],
        ['Değerlendirme', '5 dk', 'Planlı'],
      ],
    },
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'table-classic-4x4',
    name: 'Veri Tablosu (4x4)',
    subtitle: 'Geniş Veri Tablosu',
    category: 'objects',
    chartGroup: 'tables',
    defaultWidth: 390,
    defaultHeight: 200,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#4f46e5',
    chartPalette: 'vibrant',
    tableData: {
      headers: ['Dönem', 'Sayısal', 'Sözel', 'Ortalama'],
      rows: [
        ['1. Hafta', '75', '80', '77.5'],
        ['2. Hafta', '82', '84', '83.0'],
        ['3. Hafta', '90', '88', '89.0'],
        ['4. Hafta', '95', '92', '93.5'],
      ],
    },
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'table-compare',
    name: 'Karşılaştırma Tablosu',
    subtitle: 'Artılar / Eksiler',
    category: 'objects',
    chartGroup: 'tables',
    defaultWidth: 350,
    defaultHeight: 190,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#10b981',
    chartPalette: 'vibrant',
    tableData: {
      headers: ['Artılar (+)', 'Eksiler (-)'],
      rows: [
        ['Hızlı ve görsel öğrenme', 'İnternet gerektirir'],
        ['İnteraktif örnekler', 'Hazırlık süresi alır'],
        ['Kalıcı hafıza desteği', 'Ekran süresi artar'],
      ],
    },
    defaultAnimations: STATIC_ANIM,
  },
  {
    id: 'table-timeline',
    name: 'Zaman Çizelgesi Tablosu',
    subtitle: 'Adım Adım Süreç',
    category: 'objects',
    chartGroup: 'tables',
    defaultWidth: 360,
    defaultHeight: 195,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#6366f1',
    chartPalette: 'pastel',
    tableData: {
      headers: ['Adım', 'Aşama', 'Açıklama'],
      rows: [
        ['1', 'Gözlem', 'Problemi belirle ve incele'],
        ['2', 'Hipotez', 'Çözüm önerisi geliştir'],
        ['3', 'Deney', 'Verileri topla ve test et'],
        ['4', 'Sonuç', 'Bulguları özetle'],
      ],
    },
    defaultAnimations: STATIC_ANIM,
  },
];

interface ChartsAndTablesRendererProps {
  assetId: VectorAssetId;
  color: string;
  secondaryColor?: string;
  chartData?: ChartDataPoint[];
  chartPalette?: ChartPaletteId;
  tableData?: TableDataConfig;
  animProgress?: number;
  onUpdateTableData?: (next: TableDataConfig) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArcSlice(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const clampedEnd = Math.min(endAngle, startAngle + 359.9);
  const p1 = polarToCartesian(cx, cy, rOuter, clampedEnd);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const largeArc = clampedEnd - startAngle <= 180 ? '0' : '1';

  if (rInner <= 0) {
    return `M ${cx} ${cy} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
  }
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, clampedEnd);
  return `M ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} A ${rInner} ${rInner} 0 ${largeArc} 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} Z`;
}

export const ChartsAndTablesRenderer: React.FC<ChartsAndTablesRendererProps> = ({
  assetId,
  secondaryColor = '#ffffff',
  chartData,
  chartPalette = 'vibrant',
  tableData,
  animProgress = 1,
  onUpdateTableData,
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const palette = CHART_PALETTES[chartPalette] || CHART_PALETTES.vibrant;
  const p = Math.max(0.02, Math.min(1, animProgress));
  const series =
    chartData && chartData.length > 0
      ? chartData
      : assetId === 'chart-pie' || assetId === 'chart-donut'
        ? DEFAULT_PIE_SERIES
        : DEFAULT_CHART_SERIES;

  const maxVal = Math.max(1, ...series.map((d) => Math.abs(d.value)));

  // ==========================================
  // CHARTS RENDERING (SVG)
  // ==========================================
  if (assetId === 'chart-bar') {
    const plotW = 250;
    const plotH = 128;
    const startX = 42;
    const baseY = 152;
    const slotW = plotW / series.length;
    const barW = Math.min(38, slotW * 0.58);

    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ backgroundColor: secondaryColor }}
      >
        <svg viewBox="0 0 320 190" className="w-full h-full">
          {[0.25, 0.5, 0.75, 1].map((t, i) => {
            const gy = baseY - plotH * t;
            return (
              <g key={i}>
                <line x1={startX} y1={gy} x2={startX + plotW} y2={gy} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                <text x={startX - 6} y={gy + 3} textAnchor="end" fontSize="9" fill="#64748b">
                  {Math.round(maxVal * t)}
                </text>
              </g>
            );
          })}
          <line x1={startX} y1={baseY} x2={startX + plotW} y2={baseY} stroke="#94a3b8" strokeWidth="1.5" />
          <line x1={startX} y1={baseY - plotH} x2={startX} y2={baseY} stroke="#94a3b8" strokeWidth="1.5" />
          {series.map((d, idx) => {
            const h = (Math.max(0, d.value) / maxVal) * plotH * p;
            const x = startX + idx * slotW + (slotW - barW) / 2;
            const y = baseY - h;
            const barColor = palette.colors[idx % palette.colors.length];
            return (
              <g key={idx}>
                <rect x={x} y={y} width={barW} height={h} rx="4" fill={barColor} />
                {p > 0.7 && (
                  <text x={x + barW / 2} y={Math.max(14, y - 5)} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">
                    {d.value}
                  </text>
                )}
                <text x={x + barW / 2} y={baseY + 15} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">
                  {d.label.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (assetId === 'chart-hbar') {
    const startX = 78;
    const maxBarW = 200;
    const rowH = 148 / series.length;
    const barH = Math.min(22, rowH * 0.58);

    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ backgroundColor: secondaryColor }}
      >
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <line x1={startX} y1="16" x2={startX} y2="164" stroke="#94a3b8" strokeWidth="1.5" />
          {series.map((d, idx) => {
            const w = (Math.max(0, d.value) / maxVal) * maxBarW * p;
            const y = 18 + idx * rowH + (rowH - barH) / 2;
            const barColor = palette.colors[idx % palette.colors.length];
            return (
              <g key={idx}>
                <text x={startX - 8} y={y + barH / 2 + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#334155">
                  {d.label.slice(0, 9)}
                </text>
                <rect x={startX} y={y} width={maxBarW} height={barH} rx="4" fill="#f1f5f9" />
                <rect x={startX} y={y} width={w} height={barH} rx="4" fill={barColor} />
                {p > 0.7 && (
                  <text x={startX + w + 6} y={y + barH / 2 + 3.5} fontSize="10" fontWeight="bold" fill="#1e293b">
                    {d.value}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (assetId === 'chart-pie' || assetId === 'chart-donut') {
    const total = Math.max(1, series.reduce((acc, item) => acc + Math.max(0, item.value), 0));
    const isDonut = assetId === 'chart-donut';
    let currentAngle = 0;

    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ backgroundColor: secondaryColor }}
      >
        <svg viewBox="0 0 260 190" className="w-full h-full">
          {series.map((d, idx) => {
            const sliceAngle = (Math.max(0, d.value) / total) * 360 * p;
            const start = currentAngle;
            const end = currentAngle + sliceAngle;
            currentAngle = end;
            const sliceColor = palette.colors[idx % palette.colors.length];
            return (
              <path
                key={idx}
                d={describeArcSlice(86, 95, 66, isDonut ? 36 : 0, start, end)}
                fill={sliceColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          })}
          {isDonut && (
            <text x="86" y="100" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">
              {Math.round(total * p)}
            </text>
          )}
          {/* Legend */}
          {series.slice(0, 6).map((d, idx) => {
            const ly = 34 + idx * 24;
            const sliceColor = palette.colors[idx % palette.colors.length];
            const pct = Math.round((Math.max(0, d.value) / total) * 100);
            return (
              <g key={idx}>
                <rect x="166" y={ly} width="10" height="10" rx="2.5" fill={sliceColor} />
                <text x="181" y={ly + 8.5} fontSize="10" fontWeight="600" fill="#334155">
                  {d.label.slice(0, 7)} ({pct}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (assetId === 'chart-line') {
    const startX = 42;
    const plotW = 248;
    const plotH = 122;
    const baseY = 148;
    const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;
    const points = series.map((d, idx) => ({
      x: startX + idx * stepX,
      y: baseY - (Math.max(0, d.value) / maxVal) * plotH,
      label: d.label,
      value: d.value,
    }));
    const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const lineColor = palette.colors[0];

    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ backgroundColor: secondaryColor }}
      >
        <svg viewBox="0 0 320 185" className="w-full h-full">
          {[0.25, 0.5, 0.75, 1].map((t, i) => {
            const gy = baseY - plotH * t;
            return (
              <g key={i}>
                <line x1={startX} y1={gy} x2={startX + plotW} y2={gy} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                <text x={startX - 6} y={gy + 3} textAnchor="end" fontSize="9" fill="#64748b">
                  {Math.round(maxVal * t)}
                </text>
              </g>
            );
          })}
          <line x1={startX} y1={baseY} x2={startX + plotW} y2={baseY} stroke="#94a3b8" strokeWidth="1.5" />
          <defs>
            <clipPath id="line-reveal-clip">
              <rect x={startX - 6} y="10" width={(plotW + 16) * p} height="150" />
            </clipPath>
          </defs>
          <g clipPath="url(#line-reveal-clip)">
            <path d={linePath} fill="none" stroke={lineColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((pt, idx) => (
              <g key={idx}>
                <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke={lineColor} strokeWidth="3" />
                <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">
                  {pt.value}
                </text>
              </g>
            ))}
          </g>
          {points.map((pt, idx) => (
            <text key={idx} x={pt.x} y={baseY + 15} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">
              {pt.label.slice(0, 8)}
            </text>
          ))}
        </svg>
      </div>
    );
  }

  if (assetId === 'chart-progress') {
    const item = series[0] || { label: 'İlerleme', value: 75 };
    const pct = Math.max(0, Math.min(100, item.value)) * p;
    const fillCol = palette.colors[0];

    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-col justify-center gap-2"
        style={{ backgroundColor: secondaryColor }}
      >
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span className="truncate">{item.label}</span>
          <span style={{ color: fillCol }}>%{Math.round(pct)}</span>
        </div>
        <div className="w-full h-5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${pct}%`, backgroundColor: fillCol }}
          />
        </div>
      </div>
    );
  }

  if (assetId === 'chart-gauge') {
    const item = series[0] || { label: 'Puan', value: 84 };
    const pct = Math.max(0, Math.min(100, item.value)) * p;
    const fillCol = palette.colors[0];
    const sweep = (pct / 100) * 180;

    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ backgroundColor: secondaryColor }}
      >
        <svg viewBox="0 0 200 150" className="w-full h-full">
          <path
            d={describeArcSlice(100, 108, 72, 48, -90, 90)}
            fill="#e2e8f0"
          />
          <path
            d={describeArcSlice(100, 108, 72, 48, -90, -90 + sweep)}
            fill={fillCol}
          />
          <text x="100" y="102" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">
            %{Math.round(pct)}
          </text>
          <text x="100" y="132" textAnchor="middle" fontSize="11" fontWeight="600" fill="#475569">
            {item.label.slice(0, 18)}
          </text>
        </svg>
      </div>
    );
  }

  // ==========================================
  // TABLES RENDERING (EDITABLE ON DOUBLE-CLICK)
  // ==========================================
  const currentTable: TableDataConfig = tableData || {
    headers: ['Sütun 1', 'Sütun 2', 'Sütun 3'],
    rows: [
      ['Veri A1', 'Veri A2', 'Veri A3'],
      ['Veri B1', 'Veri B2', 'Veri B3'],
    ],
  };

  const commitCellEdit = (row: number, col: number) => {
    if (!onUpdateTableData) {
      setEditingCell(null);
      return;
    }
    if (row === -1) {
      const nextHeaders = currentTable.headers.map((h, i) => (i === col ? draftValue : h));
      onUpdateTableData({ ...currentTable, headers: nextHeaders });
    } else {
      const nextRows = currentTable.rows.map((r, ri) =>
        ri === row ? r.map((c, ci) => (ci === col ? draftValue : c)) : r
      );
      onUpdateTableData({ ...currentTable, rows: nextRows });
    }
    setEditingCell(null);
  };

  const startEdit = (row: number, col: number, currentVal: string) => {
    if (!onUpdateTableData) return;
    setEditingCell({ row, col });
    setDraftValue(currentVal);
  };

  if (assetId === 'table-timeline') {
    return (
      <div
        className="w-full h-full rounded-xl border border-slate-200 shadow-sm p-2.5 flex flex-col justify-between gap-1.5 overflow-hidden"
        style={{ backgroundColor: secondaryColor }}
      >
        {currentTable.rows.map((row, rIdx) => {
          const badgeColor = palette.colors[rIdx % palette.colors.length];
          return (
            <div
              key={rIdx}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70"
            >
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEdit(rIdx, 0, row[0] || '');
                }}
                className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                style={{ backgroundColor: badgeColor }}
              >
                {editingCell?.row === rIdx && editingCell.col === 0 ? (
                  <input
                    autoFocus
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onBlur={() => commitCellEdit(rIdx, 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitCellEdit(rIdx, 0);
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-5 text-center bg-white text-slate-900 rounded text-[10px]"
                  />
                ) : (
                  row[0] || rIdx + 1
                )}
              </span>
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit(rIdx, 1, row[1] || '');
                  }}
                  className="text-xs font-bold text-slate-900 shrink-0"
                >
                  {editingCell?.row === rIdx && editingCell.col === 1 ? (
                    <input
                      autoFocus
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      onBlur={() => commitCellEdit(rIdx, 1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitCellEdit(rIdx, 1);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-20 bg-white border border-indigo-400 rounded px-1 text-xs"
                    />
                  ) : (
                    row[1]
                  )}
                </span>
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit(rIdx, 2, row[2] || '');
                  }}
                  className="text-[11px] text-slate-600 truncate flex-1"
                >
                  {editingCell?.row === rIdx && editingCell.col === 2 ? (
                    <input
                      autoFocus
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      onBlur={() => commitCellEdit(rIdx, 2)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitCellEdit(rIdx, 2);
                        if (e.key === 'Escape') setEditingCell(null);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full bg-white border border-indigo-400 rounded px-1 text-[11px]"
                    />
                  ) : (
                    row[2]
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const isCompare = assetId === 'table-compare';

  return (
    <div
      className="w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
      style={{ backgroundColor: secondaryColor }}
    >
      <table className="w-full h-full border-collapse text-left table-fixed">
        <thead>
          <tr style={{ backgroundColor: palette.headerBg }}>
            {currentTable.headers.map((header, cIdx) => (
              <th
                key={cIdx}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEdit(-1, cIdx, header);
                }}
                className="px-2.5 py-2 text-[11px] font-bold text-white border-r border-white/20 last:border-r-0 truncate"
              >
                {editingCell?.row === -1 && editingCell.col === cIdx ? (
                  <input
                    autoFocus
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    onBlur={() => commitCellEdit(-1, cIdx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitCellEdit(-1, cIdx);
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-full bg-white text-slate-900 rounded px-1 py-0.5 text-[11px]"
                  />
                ) : (
                  header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentTable.rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              style={{ backgroundColor: rIdx % 2 === 1 ? palette.softBg : secondaryColor }}
            >
              {currentTable.headers.map((_, cIdx) => {
                const cellVal = row[cIdx] ?? '';
                const isEditing = editingCell?.row === rIdx && editingCell.col === cIdx;
                return (
                  <td
                    key={cIdx}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEdit(rIdx, cIdx, cellVal);
                    }}
                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-800 border-t border-r border-slate-200 last:border-r-0 truncate"
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        onBlur={() => commitCellEdit(rIdx, cIdx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitCellEdit(rIdx, cIdx);
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full bg-white border border-indigo-400 rounded px-1 py-0.5 text-[11px]"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {isCompare && cIdx === 0 && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        {isCompare && cIdx === 1 && (
                          <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className="truncate">{cellVal}</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

