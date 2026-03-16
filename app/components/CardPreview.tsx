"use client";
import React from "react";

type Position = "GK" | "CB" | "CM" | "ST";
type ColorMode = 1 | 2 | 3;
type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

type AvatarStyle = {
  text?: string;
  textColor: string;
  colorMode: ColorMode;
  colors: [string, string, string];
};

type CardItem = {
  id: string;
  name: string;
  nation: string;
  position: Position;
  rating: number;
  atk: number;
  def: number;
  pas: number;
  imp: number;
  series: "Futsal" | "Real Soccer";
  region: "ASIA" | "EU" | "AMERICAS";
  effect?: string;
  avatarStyle?: AvatarStyle;
  owner: string;
  ownerId: number;
  listed?: { price: number; currency: "COIN" };
  stock: number;
  floorHint?: number;
  isBought?: boolean;
  isFromShop?: boolean;
  ownerRole?: string;
};

const DEFAULT_AVATAR_STYLE: AvatarStyle = {
  textColor: "#FFFFFF",
  colorMode: 1,
  colors: ["#8b6914", "#8b6914", "#8b6914"],
};

const EFFECT_RARITY: Record<string, Rarity> = {
  "GlowPulse": "RARE",
  "EmberFlame": "RARE",
  "GoldSparkle": "EPIC",
  "IceStorm": "EPIC",
  "ShadowAura": "LEGENDARY",
  "HolyLight": "LEGENDARY",
  "InfernoBurst": "LEGENDARY",
  "Hologram": "LEGENDARY",
};

const RARITY_STYLE: Record<Rarity, { label: string; color: string; bg: string; glow: string }> = {
  COMMON: { label: "COMMON", color: "#9ca3af", bg: "rgba(156,163,175,.15)", glow: "none" },
  RARE: { label: "RARE", color: "#60a5fa", bg: "rgba(96,165,250,.15)", glow: "0 0 6px rgba(96,165,250,.4)" },
  EPIC: { label: "EPIC", color: "#c084fc", bg: "rgba(192,132,252,.15)", glow: "0 0 8px rgba(192,132,252,.5)" },
  LEGENDARY: { label: "LEGENDARY", color: "#fb923c", bg: "rgba(251,146,60,.15)", glow: "0 0 10px rgba(251,146,60,.5)" },
};

function getCardRarity(effect?: string): Rarity {
  return EFFECT_RARITY[effect ?? ""] ?? "COMMON";
}

function getTierClass(rating: number) {
  if (rating >= 81) return "fo-tier-ruby";
  if (rating >= 71) return "fo-tier-diamond";
  if (rating >= 61) return "fo-tier-gold";
  return "fo-tier-silver";
}

function buildAvatarBg(style?: AvatarStyle) {
  const s = style ?? DEFAULT_AVATAR_STYLE;
  const c = s.colors;
  if (s.colorMode === 1) return c[0];
  if (s.colorMode === 2) return `linear-gradient(90deg, ${c[0]} 50%, ${c[1]} 50%)`;
  return `linear-gradient(90deg, ${c[0]} 33.3%, ${c[1]} 33.3%, ${c[1]} 66.6%, ${c[2]} 66.6%)`;
}

function FlagVN() {
  return (
    <svg viewBox="0 0 60 40" width="20" height="13" style={{ display: "block", borderRadius: 2 }}>
      <rect width="60" height="40" fill="#da251d" />
      <polygon
        points="30,8 34.05,19.45 46.18,19.45 36.36,26.55 40.1,38 30,31.2 19.9,38 23.64,26.55 13.82,19.45 25.95,19.45"
        fill="#ffff00"
      />
    </svg>
  );
}

function FlagIcon({ nation }: { nation: string }) {
  if (nation === "VN") return <FlagVN />;
  return (
    <div style={{
      width: 20, height: 13, borderRadius: 2,
      background: "rgba(255,255,255,.15)",
      border: "1px solid rgba(255,255,255,.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 7, fontWeight: 800, color: "rgba(255,255,255,.7)",
      letterSpacing: ".04em",
    }}>
      {nation}
    </div>
  );
}

function EffectLayers({ effect }: { effect?: string }) {
  if (!effect) return null;

  const sparkPositions = [
    { left: "14%", top: "68%", d: "0s" }, { left: "28%", top: "62%", d: ".4s" },
    { left: "75%", top: "65%", d: ".8s" }, { left: "60%", top: "58%", d: "1.2s" },
    { left: "50%", top: "78%", d: "1.6s" }, { left: "85%", top: "60%", d: "2.0s" },
    { left: "20%", top: "82%", d: "2.4s" },
  ];

  const sparks = effect === "GoldSparkle" ? sparkPositions : [];
  const embers = effect === "EmberFlame" ? [
    { left: "15%", top: "84%", d: "0s" }, { left: "30%", top: "88%", d: ".3s" },
    { left: "48%", top: "86%", d: ".65s" }, { left: "65%", top: "90%", d: ".9s" },
    { left: "80%", top: "84%", d: "1.2s" }, { left: "40%", top: "92%", d: "1.5s" },
  ] : [];
  const iceSparks = effect === "IceStorm" ? sparkPositions : [];
  const shadowSparks = effect === "ShadowAura" ? sparkPositions : [];
  const holySparks = effect === "HolyLight" ? sparkPositions : [];
  const infernoSparks = effect === "InfernoBurst" ? sparkPositions : [];
  const isElectric = effect === "Electric";
  const isHolo = effect === "Hologram";

  const glitchSlices = isElectric ? [
    { top: "12%", h: "4%", d: "0s" }, { top: "35%", h: "2%", d: ".5s" },
    { top: "58%", h: "5%", d: "1s" }, { top: "78%", h: "3%", d: "1.5s" },
    { top: "45%", h: "2%", d: "2s" },
  ] : [];

  return (
    <div className="fofx_layer">
      {sparks.map((p, i) => (
        <span key={i} className="fofx_spark" style={{ left: p.left, top: p.top, animationDelay: p.d }} />
      ))}
      {embers.map((e, i) => (
        <span key={i} className="fofx_ember" style={{ left: e.left, top: e.top, animationDelay: e.d }} />
      ))}
      {iceSparks.map((s, i) => (
        <span key={i} className="fofx_sparkIce" style={{ left: s.left, top: s.top, animationDelay: s.d }} />
      ))}
      {shadowSparks.map((s, i) => (
        <span key={i} className="fofx_sparkShadow" style={{ left: s.left, top: s.top, animationDelay: s.d }} />
      ))}
      {holySparks.map((r, i) => (
        <span key={i} className="fofx_sparkHoly" style={{ left: r.left, top: r.top, animationDelay: r.d }} />
      ))}
      {infernoSparks.map((e, i) => (
        <span key={i} className="fofx_sparkInferno" style={{ left: e.left, top: e.top, animationDelay: e.d }} />
      ))}
      {isElectric && (
        <>
          <span className="fofx_glitchR" />
          <span className="fofx_glitchB" />
          {glitchSlices.map((s, i) => (
            <span key={i} className="fofx_glitchSlice" style={{ top: s.top, height: s.h, animationDelay: s.d }} />
          ))}
        </>
      )}
      {isHolo && (
        <>
          {sparks.map((p, i) => (
            <span key={`h${i}`} className="fofx_sparkHolo" style={{ left: p.left, top: p.top, animationDelay: p.d }} />
          ))}
        </>
      )}
    </div>
  );
}

export function CardPreview({ item, avatarText, avatarStyleOverride }: {
  item: CardItem;
  avatarText?: string;
  avatarStyleOverride?: AvatarStyle;
}) {
  const initials = avatarText
    ? avatarText.trim().slice(0, 2).toUpperCase()
    : (item.avatarStyle?.text || item.name.trim().slice(0, 2)).toUpperCase();
  const avStyle = avatarStyleOverride ?? item.avatarStyle ?? DEFAULT_AVATAR_STYLE;
  const effect = item.effect;
  const effectClassMap: Record<string, string> = {
    GlowPulse: "fofx_glow", EmberFlame: "fofx_flame", GoldSparkle: "fofx_sparkle",
    IceStorm: "fofx_ice", ShadowAura: "fofx_shadow", HolyLight: "fofx_holy",
    InfernoBurst: "fofx_inferno", Electric: "fofx_electric", Hologram: "fofx_holo",
  };
  const effectClass = effect ? effectClassMap[effect] ?? "" : "";
  const tierClass = getTierClass(item.rating);
  const rarity = getCardRarity(effect);
  const rarStyle = RARITY_STYLE[rarity];
  const stats = [
    { label: "ATK", value: item.atk },
    { label: "DEF", value: item.def },
    { label: "PAS", value: item.pas },
    { label: "IMP", value: item.imp },
  ];

  return (
    <>
      <CardPreviewStyles />
      <div className={`fo-card ${effectClass} ${tierClass}`}>
        <div className="fo-card-inner">
          <div className="fo-pattern" />

          <div className="fo-info">
            <div className="fo-rating">{item.rating}</div>
            <div className="fo-pos">{item.position}</div>
            <div className="fo-nation"><FlagIcon nation={item.nation} /></div>
          </div>

          <div className="fo-avatar-wrap">
            <div
              className="fo-avatar"
              style={{ background: buildAvatarBg(avStyle) }}
            >
              <span className="fo-initials" style={{ color: avStyle.textColor }}>
                {initials}
              </span>
            </div>
          </div>

          <div className="fo-namebar">
            <div className="fo-name">{item.name.toUpperCase()}</div>
          </div>

          <div className="fo-divider" />

          <div className="fo-stats">
            {stats.map((s) => (
              <div key={s.label} className="fo-stat">
                <div className="fo-stat-label">{s.label}</div>
                <div className="fo-stat-val">{s.value}</div>
                <div className="fo-stat-bar">
                  <div
                    className="fo-stat-bar-fill"
                    style={{ width: `${Math.min(s.value, 99)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="fo-footer">
            <div className="fo-series">{item.series.toUpperCase()}</div>
            {rarity !== "COMMON" ? (
              <div className="fo-rarity" style={{ color: rarStyle.color, background: rarStyle.bg, boxShadow: rarStyle.glow, border: `1px solid ${rarStyle.color}33` }}>
                {rarStyle.label}
              </div>
            ) : (
              <div className="fo-region">{item.region}</div>
            )}
            <div className="fo-id">
              {item.rating >= 91
                ? "S"
                : item.rating >= 81
                ? "A"
                : item.rating >= 71
                ? "B"
                : item.rating >= 61
                ? "C"
                : "D"}
            </div>
          </div>
        </div>

        <div className="fo-shimmer" />
        <div className="fo-border" />
        <EffectLayers effect={effect} />
      </div>
    </>
  );
}

// CSS Styles - copy từ app/page.tsx
function CardPreviewStyles() {
  return (
    <style jsx global>{`
      :root {
        --fo-gold: #d4a843;
        --fo-gold-light: #f2d97a;
        --fo-gold-dark: #8b6914;
      }

      .fo-card {
        position: relative;
        width: 240px;
        height: 340px;
        color: #fff;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        filter: drop-shadow(0 8px 24px rgba(0,0,0,.5));
        transition: transform .25s ease, filter .25s ease;
        isolation: isolate;
      }
      .fo-card:hover {
        transform: translateY(-4px) scale(1.02);
        filter: drop-shadow(0 16px 40px rgba(0,0,0,.6));
      }

      .fo-card-inner {
        position: absolute;
        inset: 0;
        clip-path: polygon(
          50% 0%, 100% 15%,
          100% 85%, 50% 100%,
          0% 85%, 0% 15%
        );
        background:
          linear-gradient(165deg, #3a3a3a 0%, #1a1a1a 35%, #0d0d0d 100%);
        overflow: hidden;
      }

      .fo-card-inner::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 55%;
        clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
        background:
          linear-gradient(145deg, var(--fo-gold) 0%, var(--fo-gold-dark) 60%, #4a3510 100%);
        opacity: .95;
      }

      .fo-card-inner::after {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background:
          linear-gradient(145deg, transparent 48.5%, rgba(255,255,255,.08) 49%, rgba(255,255,255,.08) 49.5%, transparent 50%),
          linear-gradient(145deg, transparent 53.5%, rgba(255,255,255,.04) 54%, rgba(255,255,255,.04) 54.5%, transparent 55%);
        pointer-events: none;
        z-index: 1;
      }

      .fo-card .fo-shimmer {
        position: absolute;
        inset: 0;
        overflow: hidden;
        z-index: 2;
        pointer-events: none;
        clip-path: polygon(
          50% 0%, 100% 15%,
          100% 85%, 50% 100%,
          0% 85%, 0% 15%
        );
      }
      .fo-card .fo-shimmer::after {
        content: "";
        position: absolute;
        top: -20%; bottom: -20%;
        width: 35%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06), transparent);
        transform: rotate(18deg);
        animation: fo_shine 4s ease-in-out infinite;
      }

      .fo-card .fo-border {
        position: absolute;
        inset: 0;
        clip-path: polygon(
          50% 0%, 100% 15%,
          100% 85%, 50% 100%,
          0% 85%, 0% 15%
        );
        border: 2px solid rgba(212,168,67,.4);
        pointer-events: none;
        z-index: 10;
        animation: fo_borderPulse 3s ease-in-out infinite;
      }

      .fo-card .fo-pattern {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 55%;
        opacity: .06;
        z-index: 1;
        background:
          repeating-linear-gradient(
            60deg,
            transparent, transparent 8px,
            rgba(255,255,255,.5) 8px, rgba(255,255,255,.5) 9px
          ),
          repeating-linear-gradient(
            -60deg,
            transparent, transparent 8px,
            rgba(255,255,255,.5) 8px, rgba(255,255,255,.5) 9px
          );
      }

      .fo-info {
        position: absolute;
        left: 16px;
        top: 55px;
        z-index: 5;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .fo-rating {
        font-size: 40px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -.03em;
        text-shadow: 0 2px 8px rgba(0,0,0,.5);
        color: #fff;
      }
      .fo-pos {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: .12em;
        text-shadow: 0 1px 4px rgba(0,0,0,.5);
        color: rgba(255,255,255,.9);
      }
      .fo-nation {
        margin-top: 5px;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,.5));
        line-height: 0;
      }

      .fo-avatar-wrap {
        position: absolute;
        top: 30px;
        left: 50%;
        transform: translateX(-30%);
        z-index: 3;
      }
      .fo-avatar {
        width: 128px;
        height: 128px;
        border-radius: 50%;
        background: #2a2a2a;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border: 4px solid rgba(0,0,0,.6);
        box-shadow: 0 0 0 2px rgba(212,168,67,.3), 0 6px 20px rgba(0,0,0,.4);
      }
      .fo-avatar::before {
        content: "";
        position: absolute;
        inset: 2px;
        border-radius: 50%;
        background:
          radial-gradient(circle at 38% 32%, rgba(255,255,255,.22), transparent 55%),
          radial-gradient(circle at 50% 110%, rgba(0,0,0,.45), transparent 60%);
        mix-blend-mode: soft-light;
      }
      .fo-avatar .fo-initials {
        font-size: 52px;
        font-weight: 900;
        color: rgba(255,255,255,.92);
        text-shadow: 0 3px 10px rgba(0,0,0,.4);
        z-index: 1;
        letter-spacing: -.02em;
      }

      .fo-namebar {
        position: absolute;
        left: 0; right: 0;
        top: 172px;
        z-index: 5;
        text-align: center;
        padding: 6px 0;
      }
      .fo-namebar::before {
        content: "";
        position: absolute;
        left: 12%; right: 12%;
        top: 0; bottom: 0;
        background: rgba(0,0,0,.5);
        clip-path: polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%);
        backdrop-filter: blur(4px);
      }
      .fo-name {
        position: relative;
        font-size: 16px;
        font-weight: 900;
        letter-spacing: .14em;
        text-shadow: 0 1px 6px rgba(0,0,0,.6);
        color: #fff;
      }

      .fo-divider {
        position: absolute;
        left: 30px; right: 30px;
        top: 202px;
        height: 2px;
        z-index: 5;
        background:
          linear-gradient(90deg, transparent, var(--fo-gold), var(--fo-gold-light), var(--fo-gold), transparent);
        opacity: .6;
      }
      .fo-divider::before, .fo-divider::after {
        content: "";
        position: absolute;
        top: -3px;
        width: 8px;
        height: 8px;
        background: var(--fo-gold);
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fo-divider::before { left: 0; }
      .fo-divider::after { right: 0; }

      .fo-stats {
        position: absolute;
        left: 24px; right: 24px;
        top: 214px;
        z-index: 5;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      .fo-stat {
        text-align: center;
        padding: 4px 0;
        position: relative;
      }
      .fo-stat::after {
        content: "";
        position: absolute;
        right: 0; top: 20%; bottom: 20%;
        width: 1px;
        background: linear-gradient(180deg, transparent, rgba(212,168,67,.3), transparent);
      }
      .fo-stat:last-child::after { display: none; }

      .fo-stat-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .15em;
        color: var(--fo-gold);
        text-transform: uppercase;
      }
      .fo-stat-val {
        font-size: 22px;
        font-weight: 900;
        line-height: 1.1;
        letter-spacing: -.02em;
        color: #fff;
        text-shadow: 0 1px 4px rgba(0,0,0,.3);
      }

      .fo-stat-bar {
        margin-top: 3px;
        height: 3px;
        background: rgba(255,255,255,.08);
        position: relative;
        clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%);
      }
      .fo-stat-bar-fill {
        position: absolute;
        left: 0; top: 0; bottom: 0;
        background: linear-gradient(90deg, var(--fo-gold-dark), var(--fo-gold-light));
        clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
        transition: width .6s ease;
      }

      .fo-footer {
        position: absolute;
        left: 40px; right: 40px;
        bottom: 58px;
        z-index: 5;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .fo-series {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .1em;
        color: var(--fo-gold);
        padding: 2px 8px;
        background: rgba(212,168,67,.1);
        clip-path: polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%);
      }
      .fo-region {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .1em;
        color: rgba(255,255,255,.5);
      }
      .fo-id {
        font-size: 9px;
        font-weight: 700;
        color: rgba(255,255,255,.3);
        letter-spacing: .05em;
      }
      .fo-rarity {
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .15em;
        padding: 1px 6px;
        border-radius: 3px;
        text-transform: uppercase;
      }

      .fofx_layer {
        position:absolute; inset:0; pointer-events:none; z-index:6;
        clip-path: polygon(
          50% 0%, 100% 15%,
          100% 85%, 50% 100%,
          0% 85%, 0% 15%
        );
        overflow: hidden;
      }

      .fo-tier-silver .fo-card-inner::before {
        background: linear-gradient(145deg, #b0b0b0 0%, #7a7a7a 50%, #4a4a4a 100%);
      }
      .fo-tier-silver .fo-stat-label,
      .fo-tier-silver .fo-series { color: #b0b0b0; }
      .fo-tier-silver .fo-stat-bar-fill {
        background: linear-gradient(90deg, #6a6a6a, #c0c0c0);
      }
      .fo-tier-silver .fo-border { border-color: rgba(180,180,180,.3); }
      .fo-tier-silver .fo-divider { background: linear-gradient(90deg, transparent, #999, #bbb, #999, transparent); }
      .fo-tier-silver .fo-divider::before,
      .fo-tier-silver .fo-divider::after { background: #aaa; }

      .fo-tier-gold .fo-card-inner::before {
        background: linear-gradient(145deg, var(--fo-gold) 0%, var(--fo-gold-dark) 60%, #4a3510 100%);
      }

      .fo-tier-diamond .fo-card-inner::before {
        background: linear-gradient(145deg, #7dd3fc 0%, #2563eb 40%, #1e1b4b 100%);
      }
      .fo-tier-diamond .fo-stat-label,
      .fo-tier-diamond .fo-series { color: #7dd3fc; }
      .fo-tier-diamond .fo-stat-bar-fill {
        background: linear-gradient(90deg, #2563eb, #7dd3fc);
      }
      .fo-tier-diamond .fo-border { border-color: rgba(125,211,252,.3); }
      .fo-tier-diamond .fo-divider { background: linear-gradient(90deg, transparent, #2563eb, #7dd3fc, #2563eb, transparent); }
      .fo-tier-diamond .fo-divider::before,
      .fo-tier-diamond .fo-divider::after { background: #38bdf8; }

      .fo-tier-ruby .fo-card-inner::before {
        background: linear-gradient(145deg, #fb7185 0%, #be123c 40%, #4c0519 100%);
      }
      .fo-tier-ruby .fo-stat-label,
      .fo-tier-ruby .fo-series { color: #fb7185; }
      .fo-tier-ruby .fo-stat-bar-fill {
        background: linear-gradient(90deg, #be123c, #fb7185);
      }
      .fo-tier-ruby .fo-border { border-color: rgba(251,113,133,.3); }
      .fo-tier-ruby .fo-divider { background: linear-gradient(90deg, transparent, #be123c, #fb7185, #be123c, transparent); }
      .fo-tier-ruby .fo-divider::before,
      .fo-tier-ruby .fo-divider::after { background: #fb7185; }

      @keyframes fo_shine {0%{left:-80%}100%{left:180%}}
      @keyframes fo_borderPulse {0%,100%{border-color:rgba(212,168,67,.4)}50%{border-color:rgba(212,168,67,.9)}}
      @keyframes fo_float {0%{transform:translateY(10px) scale(.9); opacity:0}15%{opacity:1}50%{opacity:.8}85%{opacity:.5}100%{transform:translateY(-28px) scale(.4); opacity:0}}

      .fofx_glow .fo-card-inner {
        box-shadow: 0 0 60px rgba(212,168,67,.5) inset, 0 0 120px rgba(242,217,122,.15) inset;
      }
      .fofx_sparkle .fo-card-inner {
        box-shadow: 0 0 50px rgba(242,217,122,.45) inset, 0 0 100px rgba(242,217,122,.15) inset;
      }
      .fofx_spark {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #fff, rgba(255,245,210,.9) 40%, rgba(255,245,210,.25) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_flame .fo-card-inner {
        box-shadow: 0 0 60px rgba(255,120,60,.45) inset, 0 0 100px rgba(255,80,30,.15) inset;
      }
      .fofx_ember {
        position:absolute; width:5px; height:12px;
        background: radial-gradient(circle at 50% 15%, #fff 0%, rgba(255,220,120,1) 25%, rgba(255,100,40,.8) 60%, transparent 85%);
        filter: blur(.2px);
        animation: fo_float 1.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%);
      }
      .fofx_ice .fo-card-inner {
        box-shadow: 0 0 40px rgba(125,211,252,.35) inset, 0 0 80px rgba(56,189,248,.12) inset;
      }
      .fofx_sparkIce {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #e0faff, rgba(186,230,253,.9) 40%, rgba(56,189,248,.35) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_shadow .fo-card-inner {
        box-shadow: 0 0 40px rgba(168,85,247,.35) inset, 0 0 80px rgba(88,28,135,.2) inset;
      }
      .fofx_sparkShadow {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #f5e9ff, rgba(192,132,252,.9) 40%, rgba(139,92,246,.5) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_holy .fo-card-inner {
        box-shadow: 0 0 45px rgba(253,224,71,.35) inset, 0 0 90px rgba(255,255,255,.12) inset;
      }
      .fofx_sparkHoly {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #fff, rgba(253,224,71,.9) 40%, rgba(253,224,71,.3) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_inferno .fo-card-inner {
        box-shadow: 0 0 45px rgba(248,113,113,.4) inset, 0 0 90px rgba(249,115,22,.18) inset;
      }
      .fofx_sparkInferno {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #fff7f5, rgba(248,113,113,.9) 40%, rgba(249,115,22,.35) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.4s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_electric .fo-card-inner {
        box-shadow: 0 0 50px rgba(56,189,248,.4) inset, 0 0 30px rgba(167,139,250,.25) inset;
      }
      .fofx_glitchR {
        position:absolute; inset:0;
        background: inherit;
        mix-blend-mode: screen;
        opacity:0;
        animation: fo_glitch1 2.5s steps(1) infinite;
        background: linear-gradient(180deg, transparent, rgba(255,50,50,.12), transparent, rgba(50,50,255,.12), transparent);
      }
      .fofx_glitchB {
        position:absolute; inset:0;
        opacity:0;
        animation: fo_glitch2 2.5s steps(1) infinite;
        background: linear-gradient(180deg, transparent, rgba(50,255,255,.1), transparent);
        mix-blend-mode: screen;
      }
      .fofx_glitchSlice {
        position:absolute; left:0; right:0;
        background: rgba(56,189,248,.15);
        mix-blend-mode: screen;
      }
      @keyframes fo_glitch1 {0%,100%{clip-path:inset(0 0 95% 0);opacity:0}8%{clip-path:inset(40% 0 30% 0);opacity:1}10%{clip-path:inset(80% 0 5% 0);opacity:1}12%{opacity:0}30%{clip-path:inset(10% 0 75% 0);opacity:.8}32%{opacity:0}50%{clip-path:inset(60% 0 20% 0);opacity:1}52%{opacity:0}70%{clip-path:inset(25% 0 55% 0);opacity:.9}72%{opacity:0}90%{clip-path:inset(70% 0 10% 0);opacity:.7}92%{opacity:0}}
      @keyframes fo_glitch2 {0%,100%{transform:translateX(0)}8%{transform:translateX(-4px)}10%{transform:translateX(3px)}12%{transform:translateX(0)}30%{transform:translateX(5px)}32%{transform:translateX(0)}50%{transform:translateX(-3px)}52%{transform:translateX(0)}70%{transform:translateX(4px)}72%{transform:translateX(0)}}
      .fofx_holo .fo-card-inner {
        box-shadow: 0 0 55px rgba(34,211,238,.38) inset, 0 0 95px rgba(59,130,246,.18) inset;
      }
      .fofx_sparkHolo {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #e0faff, rgba(34,211,238,.9) 40%, rgba(34,211,238,.3) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.8s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
    `}</style>
  );
}