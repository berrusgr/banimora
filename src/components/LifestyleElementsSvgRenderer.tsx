import React from 'react';
import { VectorAssetId } from '../types/studio';

interface LifestyleElementsSvgRendererProps {
  assetId: VectorAssetId;
  color: string;
  secondaryColor: string;
}

export const LifestyleElementsSvgRenderer: React.FC<LifestyleElementsSvgRendererProps> = ({
  assetId,
  color,
  secondaryColor,
}) => {
  switch (assetId) {
    // ==========================================
    // 1. TEKNOLOJİK ALETLER (TECH & DEVICES)
    // ==========================================
    case 'el-tech-laptop':
      return (
        <svg viewBox="0 0 180 120" className="w-full h-full">
          {/* Screen Lid */}
          <rect x="26" y="12" width="128" height="76" rx="7" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Display Area */}
          <rect x="33" y="19" width="114" height="62" rx="3" fill={secondaryColor} />
          {/* Screen UI Graphics */}
          <rect x="40" y="26" width="46" height="22" rx="3" fill="#ffffff" opacity="0.9" />
          <rect x="92" y="26" width="48" height="10" rx="2" fill="#ffffff" opacity="0.7" />
          <rect x="92" y="40" width="36" height="8" rx="2" fill="#ffffff" opacity="0.55" />
          <rect x="40" y="54" width="100" height="20" rx="3" fill="#0f172a" opacity="0.16" />
          <circle cx="90" cy="15.5" r="1.5" fill="#94a3b8" />
          {/* Base / Keyboard Deck */}
          <path d="M 14,88 L 166,88 L 174,104 Q 174,108 168,108 L 12,108 Q 6,108 6,104 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Keyboard Keys */}
          <rect x="30" y="92" width="120" height="6" rx="1.5" fill="#475569" opacity="0.65" />
          <rect x="72" y="100" width="36" height="4" rx="1.5" fill="#94a3b8" />
        </svg>
      );

    case 'el-tech-phone':
      return (
        <svg viewBox="0 0 90 150" className="w-full h-full">
          {/* Phone Body */}
          <rect x="14" y="8" width="62" height="134" rx="12" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Screen */}
          <rect x="19" y="16" width="52" height="114" rx="7" fill={secondaryColor} />
          {/* Notch */}
          <rect x="34" y="16" width="22" height="5" rx="2.5" fill="#0f172a" />
          {/* App Widgets */}
          <rect x="24" y="28" width="42" height="26" rx="5" fill="#ffffff" opacity="0.9" />
          <circle cx="33" cy="41" r="6" fill={color} opacity="0.8" />
          <rect x="43" y="36" width="18" height="4" rx="2" fill="#94a3b8" />
          <rect x="43" y="43" width="12" height="3" rx="1.5" fill="#cbd5e1" />
          <rect x="24" y="61" width="19" height="19" rx="4" fill="#38bdf8" />
          <rect x="47" y="61" width="19" height="19" rx="4" fill="#fb7185" />
          <rect x="24" y="85" width="19" height="19" rx="4" fill="#34d399" />
          <rect x="47" y="85" width="19" height="19" rx="4" fill="#fbbf24" />
          {/* Dock */}
          <rect x="24" y="112" width="42" height="12" rx="4" fill="#ffffff" opacity="0.55" />
          <rect x="36" y="135" width="18" height="3" rx="1.5" fill="#cbd5e1" />
        </svg>
      );

    case 'el-tech-tablet':
      return (
        <svg viewBox="0 0 150 130" className="w-full h-full">
          {/* Tablet Body */}
          <rect x="10" y="12" width="112" height="106" rx="10" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Screen */}
          <rect x="18" y="20" width="96" height="90" rx="4" fill={secondaryColor} />
          {/* Creative Drawing / Chart on Screen */}
          <rect x="24" y="27" width="84" height="14" rx="3" fill="#ffffff" opacity="0.85" />
          <path d="M 28,88 Q 48,46 68,74 T 102,48" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <circle cx="102" cy="48" r="5" fill="#f59e0b" />
          {/* Stylus Pen */}
          <g transform="rotate(28 132 68)">
            <rect x="128" y="22" width="8" height="82" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
            <polygon points="128,104 136,104 132,115" fill={color} stroke="#0f172a" strokeWidth="1.5" />
            <rect x="128" y="28" width="8" height="6" fill={color} />
          </g>
        </svg>
      );

    case 'el-tech-monitor':
      return (
        <svg viewBox="0 0 170 135" className="w-full h-full">
          {/* Stand Neck & Base */}
          <rect x="73" y="96" width="24" height="22" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
          <rect x="52" y="116" width="66" height="9" rx="4" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
          {/* Monitor Frame */}
          <rect x="12" y="10" width="146" height="90" rx="8" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Screen */}
          <rect x="20" y="18" width="130" height="70" rx="4" fill={secondaryColor} />
          {/* Bar Chart & Window UI */}
          <rect x="28" y="26" width="52" height="54" rx="4" fill="#ffffff" opacity="0.9" />
          <rect x="35" y="56" width="8" height="18" rx="1.5" fill={color} />
          <rect x="47" y="44" width="8" height="30" rx="1.5" fill="#38bdf8" />
          <rect x="59" y="36" width="8" height="38" rx="1.5" fill="#10b981" />
          <rect x="86" y="26" width="56" height="24" rx="4" fill="#ffffff" opacity="0.85" />
          <rect x="86" y="56" width="56" height="24" rx="4" fill="#ffffff" opacity="0.7" />
          <circle cx="85" cy="94" r="2.2" fill="#cbd5e1" />
        </svg>
      );

    case 'el-tech-headphones':
      return (
        <svg viewBox="0 0 130 130" className="w-full h-full">
          {/* Headband */}
          <path d="M 24,72 C 24,24 106,24 106,72" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
          <path d="M 38,34 C 52,24 78,24 92,34" fill="none" stroke={secondaryColor} strokeWidth="6" strokeLinecap="round" />
          {/* Left Earcup */}
          <rect x="14" y="64" width="20" height="42" rx="9" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="28" y="68" width="9" height="34" rx="4" fill={secondaryColor} stroke="#0f172a" strokeWidth="2" />
          {/* Right Earcup */}
          <rect x="96" y="64" width="20" height="42" rx="9" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="93" y="68" width="9" height="34" rx="4" fill={secondaryColor} stroke="#0f172a" strokeWidth="2" />
        </svg>
      );

    case 'el-tech-watch':
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full">
          {/* Top & Bottom Straps */}
          <rect x="33" y="8" width="34" height="30" rx="5" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.2" />
          <rect x="33" y="102" width="34" height="30" rx="5" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.2" />
          {/* Watch Case */}
          <rect x="20" y="34" width="60" height="72" rx="16" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Crown */}
          <rect x="80" y="54" width="6" height="14" rx="2" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
          {/* Screen */}
          <rect x="27" y="41" width="46" height="58" rx="10" fill="#0f172a" />
          {/* Digital Clock & Activity Ring */}
          <circle cx="50" cy="60" r="11" fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeDasharray="52 18" />
          <circle cx="50" cy="60" r="6" fill="none" stroke="#fb7185" strokeWidth="2.8" />
          <rect x="34" y="78" width="32" height="5" rx="2.5" fill="#4ade80" />
          <rect x="40" y="87" width="20" height="3.5" rx="1.5" fill="#94a3b8" />
        </svg>
      );

    case 'el-tech-camera':
      return (
        <svg viewBox="0 0 150 115" className="w-full h-full">
          {/* Viewfinder Bump & Shutter */}
          <path d="M 48,26 L 56,14 L 94,14 L 102,26 Z" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="108" y="18" width="16" height="8" rx="2" fill={secondaryColor} stroke="#0f172a" strokeWidth="2" />
          {/* Body */}
          <rect x="14" y="26" width="122" height="76" rx="12" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="14" y="42" width="122" height="44" fill={secondaryColor} opacity="0.25" />
          {/* Flash */}
          <rect x="26" y="36" width="18" height="11" rx="3" fill="#fef08a" stroke="#0f172a" strokeWidth="1.8" />
          {/* Lens */}
          <circle cx="78" cy="64" r="27" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="78" cy="64" r="20" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle cx="78" cy="64" r="12" fill={secondaryColor} opacity="0.85" />
          <circle cx="72" cy="58" r="4" fill="#ffffff" opacity="0.7" />
        </svg>
      );

    case 'el-tech-mic':
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full">
          {/* Mic Capsule */}
          <rect x="32" y="12" width="36" height="62" rx="18" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="32" y="12" width="36" height="36" rx="18" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.5" />
          {/* Grille Lines */}
          <line x1="38" y1="24" x2="62" y2="24" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
          <line x1="36" y1="32" x2="64" y2="32" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
          <line x1="38" y1="40" x2="62" y2="40" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
          {/* U-Mount & Stand */}
          <path d="M 22,52 L 22,68 A 28,28 0 0 0 78,68 L 78,52" fill="none" stroke="#475569" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="96" x2="50" y2="122" stroke="#475569" strokeWidth="5" />
          <rect x="26" y="120" width="48" height="10" rx="5" fill={color} stroke="#0f172a" strokeWidth="2.2" />
        </svg>
      );

    // ==========================================
    // 2. WEB SAYFALARI & SOSYAL MEDYA (UI & DIGITAL)
    // ==========================================
    case 'el-ui-browser':
      return (
        <svg viewBox="0 0 180 125" className="w-full h-full">
          {/* Browser Frame */}
          <rect x="8" y="8" width="164" height="109" rx="10" fill="#ffffff" stroke={color} strokeWidth="2.5" />
          {/* Top Bar */}
          <path d="M 8,18 Q 8,8 18,8 L 162,8 Q 172,8 172,18 L 172,32 L 8,32 Z" fill={secondaryColor} stroke={color} strokeWidth="2" />
          {/* Traffic Lights */}
          <circle cx="22" cy="20" r="4" fill="#ef4444" />
          <circle cx="34" cy="20" r="4" fill="#f59e0b" />
          <circle cx="46" cy="20" r="4" fill="#22c55e" />
          {/* URL Bar */}
          <rect x="58" y="14" width="102" height="12" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          {/* Hero & Content Cards */}
          <rect x="18" y="42" width="144" height="30" rx="5" fill={secondaryColor} opacity="0.7" />
          <rect x="26" y="50" width="68" height="6" rx="3" fill={color} />
          <rect x="26" y="60" width="46" height="4" rx="2" fill={color} opacity="0.5" />
          <rect x="18" y="80" width="44" height="28" rx="4" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="1.5" />
          <rect x="68" y="80" width="44" height="28" rx="4" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
          <rect x="118" y="80" width="44" height="28" rx="4" fill="#dcfce7" stroke="#bbf7d0" strokeWidth="1.5" />
        </svg>
      );

    case 'el-ui-social-card':
      return (
        <svg viewBox="0 0 140 160" className="w-full h-full">
          {/* Card Container */}
          <rect x="10" y="8" width="120" height="144" rx="12" fill="#ffffff" stroke={color} strokeWidth="2.5" />
          {/* Header Avatar & Name */}
          <circle cx="28" cy="26" r="9" fill={secondaryColor} stroke={color} strokeWidth="2" />
          <rect x="43" y="21" width="52" height="5" rx="2.5" fill={color} />
          <rect x="43" y="29" width="32" height="3.5" rx="1.5" fill="#94a3b8" />
          {/* Media Image */}
          <rect x="18" y="42" width="104" height="68" rx="7" fill={secondaryColor} />
          <circle cx="42" cy="64" r="9" fill="#fbbf24" />
          <path d="M 22,106 L 52,76 L 76,96 L 96,80 L 118,106 Z" fill={color} opacity="0.65" />
          {/* Like Heart, Comment, Share */}
          <path d="M 28,125 C 24,120 18,123 18,128 C 18,133 28,139 28,139 C 28,139 38,133 38,128 C 38,123 32,120 28,125 Z" fill="#ef4444" />
          <path d="M 48,122 L 62,122 Q 65,122 65,125 L 65,133 Q 65,136 62,136 L 54,136 L 49,140 L 50,136 L 48,136 Q 45,136 45,133 L 45,125 Q 45,122 48,122 Z" fill="none" stroke={color} strokeWidth="2" />
          <path d="M 75,130 L 89,122 L 84,138 L 81,132 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          {/* Caption Lines */}
          <rect x="18" y="143" width="68" height="4" rx="2" fill="#cbd5e1" />
        </svg>
      );

    case 'el-ui-video-player':
      return (
        <svg viewBox="0 0 180 120" className="w-full h-full">
          <rect x="8" y="8" width="164" height="104" rx="10" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="14" y="14" width="152" height="76" rx="5" fill={secondaryColor} />
          {/* Center Play Button */}
          <circle cx="90" cy="52" r="21" fill="#ffffff" opacity="0.95" />
          <polygon points="84,41 104,52 84,63" fill={color} strokeLinejoin="round" />
          {/* Progress Bar & Controls */}
          <rect x="18" y="98" width="124" height="5" rx="2.5" fill="#475569" />
          <rect x="18" y="98" width="68" height="5" rx="2.5" fill="#ef4444" />
          <circle cx="86" cy="100.5" r="4.5" fill="#ffffff" />
          <rect x="150" y="95" width="12" height="10" rx="2" fill="none" stroke="#cbd5e1" strokeWidth="1.8" />
        </svg>
      );

    case 'el-ui-notification':
      return (
        <svg viewBox="0 0 130 125" className="w-full h-full">
          {/* Speech / Alert Bubble */}
          <rect x="14" y="22" width="96" height="76" rx="18" fill={secondaryColor} stroke={color} strokeWidth="3" />
          <polygon points="36,98 26,116 54,98" fill={secondaryColor} stroke={color} strokeWidth="3" strokeLinejoin="round" />
          {/* Bell Icon inside */}
          <path d="M 62,40 C 51,40 46,49 46,60 L 42,72 L 82,72 L 78,60 C 78,49 73,40 62,40 Z" fill={color} />
          <circle cx="62" cy="76" r="5" fill={color} />
          {/* Red Badge */}
          <circle cx="102" cy="28" r="16" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
          <text x="102" y="34" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#ffffff">
            3
          </text>
        </svg>
      );

    case 'el-ui-search-bar':
      return (
        <svg viewBox="0 0 210 70" className="w-full h-full">
          <rect x="8" y="12" width="194" height="46" rx="23" fill="#ffffff" stroke={color} strokeWidth="3" />
          <circle cx="34" cy="35" r="10" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="41" y1="42" x2="48" y2="49" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <rect x="60" y="30" width="92" height="10" rx="5" fill={secondaryColor} />
          <rect x="162" y="21" width="28" height="28" rx="14" fill={color} />
          <polygon points="172,29 183,35 172,41" fill="#ffffff" />
        </svg>
      );

    case 'el-ui-like-badge':
      return (
        <svg viewBox="0 0 130 125" className="w-full h-full">
          <rect x="14" y="16" width="102" height="80" rx="22" fill={secondaryColor} stroke={color} strokeWidth="3" />
          <polygon points="56,96 65,112 74,96" fill={secondaryColor} stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path
            d="M 65,44 C 57,33 42,38 42,50 C 42,62 65,76 65,76 C 65,76 88,62 88,50 C 88,38 73,33 65,44 Z"
            fill={color}
          />
          <circle cx="52" cy="46" r="3.5" fill="#ffffff" opacity="0.6" />
        </svg>
      );

    // ==========================================
    // 3. MUTFAK & GÜNLÜK YAŞAM (KITCHEN & LIFESTYLE)
    // ==========================================
    case 'el-life-coffee':
      return (
        <svg viewBox="0 0 130 130" className="w-full h-full">
          {/* Steam */}
          <path d="M 46,32 Q 40,22 48,14" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 62,30 Q 56,18 64,10" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 78,32 Q 72,22 80,14" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          {/* Handle */}
          <path d="M 92,50 L 102,50 A 14,16 0 0 1 102,84 L 90,84" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />
          {/* Mug Body */}
          <path d="M 26,42 L 94,42 L 90,94 Q 88,108 60,108 Q 32,108 30,94 Z" fill={secondaryColor} stroke={color} strokeWidth="3" strokeLinejoin="round" />
          {/* Coffee Rim */}
          <ellipse cx="60" cy="42" rx="34" ry="7" fill="#78350f" stroke={color} strokeWidth="2.5" />
          {/* Saucer */}
          <ellipse cx="60" cy="112" rx="44" ry="7" fill="#e2e8f0" stroke={color} strokeWidth="2.5" />
        </svg>
      );

    case 'el-life-tea':
      return (
        <svg viewBox="0 0 110 135" className="w-full h-full">
          {/* Steam */}
          <path d="M 48,26 Q 42,16 50,8" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 62,24 Q 56,14 64,6" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          {/* Spoon */}
          <line x1="68" y1="18" x2="54" y2="96" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          {/* Tulip Tea Glass (İnce Belli) */}
          <path
            d="M 32,34 Q 40,62 34,82 Q 30,104 55,104 Q 80,104 76,82 Q 70,62 78,34 Z"
            fill="#f8fafc"
            stroke={color}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {/* Tea Liquid */}
          <path
            d="M 37,50 Q 41,66 36,82 Q 33,100 55,100 Q 77,100 74,82 Q 69,66 73,50 Z"
            fill="#b91c1c"
            opacity="0.88"
          />
          {/* Saucer */}
          <ellipse cx="55" cy="110" rx="40" ry="9" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
        </svg>
      );

    case 'el-life-cookware':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full">
          {/* Lid Knob */}
          <circle cx="64" cy="24" r="6" fill={color} stroke="#0f172a" strokeWidth="2" />
          {/* Lid */}
          <path d="M 24,42 Q 64,20 104,42 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2.5" />
          {/* Pot Handles */}
          <path d="M 12,50 L 24,50 L 24,62 L 12,62 Z" fill={color} stroke="#0f172a" strokeWidth="2" />
          <path d="M 104,50 L 116,50 L 116,62 L 104,62 Z" fill={color} stroke="#0f172a" strokeWidth="2" />
          {/* Pot Body */}
          <path d="M 24,42 L 104,42 L 102,94 Q 100,104 64,104 Q 28,104 26,94 Z" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.5" />
          {/* Frying Pan in front-right */}
          <line x1="112" y1="88" x2="152" y2="74" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="94" cy="94" rx="28" ry="12" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <ellipse cx="94" cy="92" rx="22" ry="7" fill="#334155" />
        </svg>
      );

    case 'el-life-coffee-maker':
      return (
        <svg viewBox="0 0 125 140" className="w-full h-full">
          {/* Machine Frame */}
          <path d="M 20,16 L 105,16 L 105,124 L 20,124 Z" rx="8" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          <rect x="20" y="16" width="85" height="26" rx="6" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.5" />
          {/* Control Buttons */}
          <circle cx="40" cy="29" r="4" fill="#22c55e" />
          <circle cx="54" cy="29" r="4" fill="#f59e0b" />
          {/* Coffee Dispenser Cavity */}
          <rect x="30" y="48" width="65" height="64" rx="4" fill="#1e293b" />
          {/* Carafe / Pot */}
          <path d="M 40,70 L 82,70 L 86,108 L 36,108 Z" fill="#e2e8f0" opacity="0.88" stroke="#94a3b8" strokeWidth="2" />
          <path d="M 38,88 L 84,88 L 86,108 L 36,108 Z" fill="#78350f" />
          <rect x="20" y="116" width="85" height="10" rx="3" fill="#475569" stroke="#0f172a" strokeWidth="2" />
        </svg>
      );

    case 'el-life-cutlery':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full">
          {/* Fork (Left) */}
          <path d="M 22,20 L 22,48 M 28,20 L 28,48 M 34,20 L 34,48" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 20,44 Q 28,54 36,44 L 31,60 L 31,102 L 25,102 L 25,60 Z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
          {/* Plate (Center) */}
          <circle cx="80" cy="60" r="42" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
          <circle cx="80" cy="60" r="28" fill="#ffffff" stroke={color} strokeWidth="1.5" opacity="0.85" />
          {/* Knife (Right) */}
          <path d="M 130,20 Q 140,22 138,58 L 134,58 L 134,102 L 128,102 L 128,20 Z" fill="#94a3b8" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );

    case 'el-life-bottle':
      return (
        <svg viewBox="0 0 90 150" className="w-full h-full">
          {/* Cap */}
          <rect x="31" y="10" width="28" height="14" rx="4" fill="#334155" stroke="#0f172a" strokeWidth="2" />
          <path d="M 38,10 A 7,7 0 0 1 52,10" fill="none" stroke="#334155" strokeWidth="3" />
          {/* Neck */}
          <rect x="35" y="24" width="20" height="10" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
          {/* Thermos Body */}
          <path d="M 24,46 Q 24,34 35,34 L 55,34 Q 66,34 66,46 L 66,130 Q 66,138 58,138 L 32,138 Q 24,138 24,130 Z" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Accent Band */}
          <rect x="24" y="64" width="42" height="30" fill={secondaryColor} opacity="0.9" />
          <line x1="32" y1="50" x2="32" y2="126" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        </svg>
      );

    case 'el-life-lamp':
      return (
        <svg viewBox="0 0 130 140" className="w-full h-full">
          {/* Warm Light Cone */}
          <polygon points="74,48 118,108 42,108" fill="#fef08a" opacity="0.45" />
          {/* Articulated Arm */}
          <path d="M 38,122 L 24,72 L 64,34" fill="none" stroke="#475569" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="72" r="5.5" fill={secondaryColor} stroke="#0f172a" strokeWidth="2" />
          {/* Base */}
          <path d="M 16,126 L 64,126 Q 64,114 40,114 Q 16,114 16,126 Z" fill={color} stroke="#0f172a" strokeWidth="2.5" />
          {/* Lamp Shade */}
          <path d="M 56,28 L 88,20 L 100,48 L 62,56 Z" fill={color} stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="80" cy="51" r="6" fill="#fde047" />
        </svg>
      );

    case 'el-life-plant':
      return (
        <svg viewBox="0 0 110 140" className="w-full h-full">
          {/* Leaves */}
          <path d="M 55,74 Q 26,54 24,26 Q 48,32 55,68 Z" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <path d="M 55,74 Q 84,54 86,26 Q 62,32 55,68 Z" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
          <path d="M 55,74 Q 44,34 55,12 Q 66,34 55,74 Z" fill="#4ade80" stroke="#14532d" strokeWidth="2" />
          {/* Pot Rim */}
          <rect x="26" y="72" width="58" height="12" rx="4" fill={color} stroke="#0f172a" strokeWidth="2.2" />
          {/* Pot Body */}
          <polygon points="32,84 78,84 70,128 40,128" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );

    case 'el-life-books':
      return (
        <svg viewBox="0 0 150 125" className="w-full h-full">
          {/* Bottom Book */}
          <rect x="18" y="84" width="114" height="24" rx="4" fill={color} stroke="#0f172a" strokeWidth="2.2" />
          <rect x="26" y="88" width="96" height="16" rx="2" fill="#f8fafc" />
          {/* Middle Book */}
          <rect x="26" y="56" width="104" height="24" rx="4" fill={secondaryColor} stroke="#0f172a" strokeWidth="2.2" />
          <rect x="34" y="60" width="88" height="16" rx="2" fill="#f8fafc" />
          {/* Top Book */}
          <rect x="20" y="28" width="102" height="24" rx="4" fill="#f59e0b" stroke="#0f172a" strokeWidth="2.2" />
          <rect x="28" y="32" width="84" height="16" rx="2" fill="#f8fafc" />
          {/* Bookmark Ribbon */}
          <polygon points="104,52 114,52 114,72 109,66 104,72" fill="#ef4444" />
        </svg>
      );

    default:
      return null;
  }
};

