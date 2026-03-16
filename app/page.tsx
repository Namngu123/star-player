"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, ShoppingCart, Trophy, HelpCircle, Search, Sparkles, Gem, Lock, LogOut, Tag, Coins, Copy, Menu, X, Bell, RefreshCw, Users } from "lucide-react";

// ================= TYPES =================
type Position = "GK" | "CB" | "CM" | "ST";
type Formation = "1-2-1" | "2-2" | "3-1" | "4-0";
type ColorMode = 1 | 2 | 3;

type AvatarStyle = {
  text?: string;
  textColor: string;
  colorMode: ColorMode;
  colors: [string, string, string];
};

type AuthState =
  | { loggedIn: false }
  | { loggedIn: true; username: string; role: "admin" | "user"; userId: number };

const DEFAULT_AVATAR_STYLE: AvatarStyle = {
  textColor: "#FFFFFF",
  colorMode: 1,
  colors: ["#8b6914", "#8b6914", "#8b6914"],
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

// ================= API HELPERS =================
/* eslint-disable @typescript-eslint/no-explicit-any */
function dbCardToFrontend(c: any, currentUserId?: number): CardItem {
  return {
    id: c.id,
    name: c.name,
    nation: c.nation,
    position: c.position as Position,
    rating: c.rating,
    atk: c.atk,
    def: c.def,
    pas: c.pas,
    imp: c.imp,
    series: c.series as "Futsal" | "Real Soccer",
    region: c.region as "ASIA" | "EU" | "AMERICAS",
    effect: c.effect ?? undefined,
    avatarStyle: {
      text: c.avatarText ?? undefined,
      textColor: c.avatarTextColor ?? "#FFFFFF",
      colorMode: (c.avatarColorMode ?? 1) as ColorMode,
      colors: [c.avatarColor1 ?? "#8b6914", c.avatarColor2 ?? "#8b6914", c.avatarColor3 ?? "#8b6914"],
    },
    owner: (c.owner?.discordGlobalName || c.owner?.discordUsername || c.owner?.username) ?? (c.ownerId === currentUserId ? "you" : "other"),
    ownerId: c.ownerId,
    listed: c.listedPrice ? { price: c.listedPrice, currency: "COIN" } : undefined,
    stock: c.stock ?? 1,
    floorHint: c.floorHint ?? undefined,
    isBought: c.isBought ?? false,
    isFromShop: c.isFromShop ?? false,
    ownerRole: c.owner?.role ?? "user",
  };
}

async function api<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  return res.json();
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ================= HELPERS =================
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

function formatHMS(sec: number) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${h}h ${pad(m)}m ${pad(r)}s`;
}

// ================= UI EFFECTS =================
function StyleFx() {
  return (
    <style>{`
      :root {
        --fo-gold: #d4a843;
        --fo-gold-light: #f2d97a;
        --fo-gold-dark: #8b6914;
        --fo-bg: #0f0d0b;
        --fo-accent: #e8c547;
        --fo-surface: rgba(26,20,18,.85);
        --fo-glass: rgba(30,24,20,.65);
        --fo-glass-border: rgba(198,169,107,.12);
      }

      /* === Premium Scrollbar === */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(198,169,107,.25); border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(198,169,107,.45); }

      /* === Ambient Background === */
      .star-bg {
        position: fixed; inset: 0; z-index: 0; pointer-events: none;
        background:
          radial-gradient(ellipse 60% 50% at 20% 10%, rgba(198,169,107,.06), transparent),
          radial-gradient(ellipse 50% 40% at 80% 90%, rgba(198,169,107,.04), transparent),
          radial-gradient(ellipse 80% 60% at 50% 50%, rgba(15,13,11,1), transparent);
      }

      /* === Glass Nav === */
      .glass-nav {
        background: rgba(20,16,13,.75);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
        border: 1px solid rgba(198,169,107,.1);
        box-shadow: 0 8px 32px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.03);
      }

      .glass-nav-btn {
        position: relative;
        padding: 8px 18px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .06em;
        color: rgba(255,248,230,.45);
        transition: all .25s ease;
        border: 1px solid transparent;
        background: transparent;
        cursor: pointer;
        white-space: nowrap;
      }
      .glass-nav-btn:hover {
        color: rgba(255,248,230,.8);
        background: rgba(198,169,107,.08);
        border-color: rgba(198,169,107,.12);
      }
      .glass-nav-btn.active {
        color: #1a1412;
        background: linear-gradient(135deg, #d4a843, #f2d97a);
        border-color: rgba(242,217,122,.5);
        box-shadow: 0 4px 20px rgba(198,169,107,.3), inset 0 1px 0 rgba(255,255,255,.2);
        text-shadow: 0 1px 0 rgba(0,0,0,.1);
      }
      .glass-nav-btn.active::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 3px;
        border-radius: 99px;
        background: var(--fo-gold-light);
        opacity: .6;
      }

      /* === Premium Header === */
      .star-header {
        position: relative;
        padding: 24px 0 16px;
      }
      .star-logo {
        font-size: 32px;
        font-weight: 900;
        letter-spacing: .08em;
        background: linear-gradient(135deg, #f2d97a 0%, #d4a843 40%, #f2d97a 60%, #8b6914 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: fo_logoShimmer 4s ease-in-out infinite;
        filter: drop-shadow(0 2px 8px rgba(198,169,107,.3));
      }
      @keyframes fo_logoShimmer {
        0%,100%{background-position:0% center}
        50%{background-position:200% center}
      }

      /* === Premium Rank Medals === */
      .medal-1 {
        background: linear-gradient(135deg, #ffd700, #ffec80, #ffd700);
        color: #7a5c00;
        box-shadow: 0 4px 16px rgba(255,215,0,.35), inset 0 1px 0 rgba(255,255,255,.4);
      }
      .medal-2 {
        background: linear-gradient(135deg, #c0c0c0, #e8e8e8, #c0c0c0);
        color: #555;
        box-shadow: 0 4px 16px rgba(192,192,192,.3), inset 0 1px 0 rgba(255,255,255,.5);
      }
      .medal-3 {
        background: linear-gradient(135deg, #cd7f32, #e8a860, #cd7f32);
        color: #5a3510;
        box-shadow: 0 4px 16px rgba(205,127,50,.3), inset 0 1px 0 rgba(255,255,255,.3);
      }

      /* === Glass Card (panels) === */
      .glass-panel {
        background: rgba(20,16,13,.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(198,169,107,.08);
        box-shadow: 0 8px 32px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.02);
        border-radius: 16px;
      }

      /* === Premium ELO Colors === */
      .elo-master { color: #ff6b6b; text-shadow: 0 0 12px rgba(255,107,107,.4); }
      .elo-diamond { color: #7dd3fc; text-shadow: 0 0 10px rgba(125,211,252,.3); }
      .elo-gold { color: #f2d97a; text-shadow: 0 0 8px rgba(242,217,122,.3); }
      .elo-silver { color: #c0c0c0; }
      .elo-bronze { color: #cd9a6b; }

      /* === Coin Badge === */
      .coin-badge {
        background: rgba(198,169,107,.08);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(198,169,107,.15);
        box-shadow: 0 4px 16px rgba(0,0,0,.2);
        border-radius: 12px;
        padding: 4px 14px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* === Topup marquee === */
      .topup-marquee {
        display: inline-flex;
        align-items: center;
        animation: topupMarquee 14s linear infinite;
      }
      @keyframes topupMarquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      /* === Divider Line === */
      .premium-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(198,169,107,.2), transparent);
      }

      /* === Modal Overlay === */
      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: fo_modalIn .25s ease;
      }
      @keyframes fo_modalIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .modal-content {
        position: relative;
        width: 92%;
        max-width: 680px;
        max-height: 85vh;
        overflow-y: auto;
        background: rgba(18,14,12,.95);
        border: 1px solid rgba(198,169,107,.1);
        border-radius: 20px;
        box-shadow: 0 24px 80px rgba(0,0,0,.6), 0 0 60px rgba(198,169,107,.06);
        padding: 24px;
        animation: fo_modalSlide .3s ease;
      }
      @keyframes fo_modalSlide {
        from { opacity: 0; transform: translateY(20px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .modal-content::-webkit-scrollbar { width: 4px; }
      .modal-content::-webkit-scrollbar-thumb { background: rgba(198,169,107,.2); border-radius: 99px; }

      @keyframes fo_pulse {0%,100%{opacity:.6; transform:scale(.99)}50%{opacity:1; transform:scale(1.02)}}
      @keyframes fo_sweep {0%{transform:translateX(-150%) rotate(18deg); opacity:0}12%{opacity:.6}55%{opacity:.4}100%{transform:translateX(150%) rotate(18deg); opacity:0}}
      @keyframes fo_float {0%{transform:translateY(10px) scale(.9); opacity:0}15%{opacity:1}50%{opacity:.8}85%{opacity:.5}100%{transform:translateY(-28px) scale(.4); opacity:0}}
      @keyframes fo_flicker {0%,100%{opacity:.5; filter:blur(6px)}50%{opacity:1; filter:blur(10px)}}
      @keyframes fo_shine {0%{left:-80%}100%{left:180%}}
      @keyframes fo_borderPulse {0%,100%{border-color:rgba(212,168,67,.4)}50%{border-color:rgba(212,168,67,.9)}}
      @keyframes fo_snowfall {0%{transform:translateY(-10px) rotate(0deg) scale(1);opacity:0}10%{opacity:1}80%{opacity:.7}100%{transform:translateY(30px) rotate(200deg) scale(.5);opacity:0}}
      @keyframes fadeIn {from{opacity:0}to{opacity:1}}
      @keyframes slideUp {from{opacity:0; transform:translateY(30px)}to{opacity:1; transform:translateY(0)}}
      @keyframes fo_shadowPulse {0%,100%{opacity:.5;transform:scale(.98)}50%{opacity:1;transform:scale(1.03)}}
      @keyframes fo_holyRay {0%{opacity:0;transform:scaleY(0)}20%{opacity:1;transform:scaleY(1)}60%{opacity:.8}100%{opacity:0;transform:scaleY(1.3)}}
      @keyframes fo_infernoBurst {0%,100%{opacity:.6;filter:blur(8px);transform:scale(.97)}50%{opacity:1;filter:blur(12px);transform:scale(1.06)}}
      @keyframes fo_glitch1 {0%,100%{clip-path:inset(0 0 95% 0);opacity:0}8%{clip-path:inset(40% 0 30% 0);opacity:1}10%{clip-path:inset(80% 0 5% 0);opacity:1}12%{opacity:0}30%{clip-path:inset(10% 0 75% 0);opacity:.8}32%{opacity:0}50%{clip-path:inset(60% 0 20% 0);opacity:1}52%{opacity:0}70%{clip-path:inset(25% 0 55% 0);opacity:.9}72%{opacity:0}90%{clip-path:inset(70% 0 10% 0);opacity:.7}92%{opacity:0}}
      @keyframes fo_glitch2 {0%,100%{transform:translateX(0)}8%{transform:translateX(-4px)}10%{transform:translateX(3px)}12%{transform:translateX(0)}30%{transform:translateX(5px)}32%{transform:translateX(0)}50%{transform:translateX(-3px)}52%{transform:translateX(0)}70%{transform:translateX(4px)}72%{transform:translateX(0)}}
      @keyframes fo_scanline {0%{top:-5%}100%{top:105%}}
      @keyframes fo_holoScan {0%{top:-10%;opacity:0}10%{opacity:.7}90%{opacity:.7}100%{top:110%;opacity:0}}
      @keyframes fo_holoFlicker {0%,100%{opacity:.7}5%{opacity:.3}10%{opacity:.8}50%{opacity:.6}55%{opacity:1}60%{opacity:.5}}

      @keyframes fo_tierPulse {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        25% { transform: scale(1.03); filter: brightness(1.15); }
        50% { transform: scale(0.97); filter: brightness(0.95); }
        75% { transform: scale(1.04); filter: brightness(1.2); }
      }
      @keyframes fo_tierEnergy {
        0% { transform: scale(0.8); opacity: 0.3; }
        50% { transform: scale(1.5); opacity: 0.6; }
        100% { transform: scale(2); opacity: 0; }
      }
      @keyframes fo_tierFodderFade {
        0% { opacity: 0.7; transform: translateY(0); }
        70% { opacity: 0.5; transform: translateY(-4px); }
        100% { opacity: 0; transform: translateY(-20px) scale(0.7); }
      }
      @keyframes fo_tierReveal {
        0% { transform: scale(0.5) rotate(-8deg); opacity: 0; filter: blur(10px); }
        40% { transform: scale(1.15) rotate(2deg); opacity: 1; filter: blur(0); }
        60% { transform: scale(0.95) rotate(-1deg); }
        80% { transform: scale(1.05) rotate(0.5deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes fo_tierGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(198,169,107,0.3), 0 0 60px rgba(198,169,107,0.1); }
        50% { box-shadow: 0 0 40px rgba(198,169,107,0.6), 0 0 100px rgba(198,169,107,0.3), 0 0 150px rgba(255,215,0,0.15); }
      }
      @keyframes fo_tierFail {
        0% { transform: scale(1); opacity: 1; }
        30% { transform: scale(1.05); opacity: 1; }
        50% { transform: scale(0.95); filter: grayscale(0.8); }
        100% { transform: scale(1); filter: grayscale(0); opacity: 1; }
      }
      @keyframes fo_tierParticle {
        0% { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
      }
      .tier-anim-pulse {
        animation: fo_tierPulse 0.8s ease-in-out infinite;
      }
      .tier-anim-energy {
        animation: fo_tierEnergy 1.5s ease-out infinite;
      }
      .tier-anim-fodder-fade {
        animation: fo_tierFodderFade 2.5s ease-in forwards;
      }
      .tier-anim-reveal {
        animation: fo_tierReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      .tier-anim-glow {
        animation: fo_tierGlow 2s ease-in-out infinite;
        border-radius: 16px;
      }
      .tier-anim-fail {
        animation: fo_tierFail 0.8s ease-out forwards;
      }

      /* ===== PACK OPENING ANIMATION ===== */
      @keyframes fo_packFlip {
        0% { transform: rotateY(0deg) scale(0.8); filter: brightness(0.5); }
        30% { transform: rotateY(540deg) scale(0.6); filter: brightness(0.3); }
        60% { transform: rotateY(900deg) scale(1.1); filter: brightness(1.5); }
        80% { transform: rotateY(1050deg) scale(1.05); filter: brightness(1.2); }
        100% { transform: rotateY(1080deg) scale(1); filter: brightness(1); }
      }
      @keyframes fo_packBurst {
        0% { transform: scale(0); opacity: 1; }
        50% { opacity: 0.8; }
        100% { transform: scale(3); opacity: 0; }
      }
      @keyframes fo_packSparkle {
        0% { transform: translate(0,0) scale(1); opacity: 1; }
        100% { transform: translate(var(--sx), var(--sy)) scale(0); opacity: 0; }
      }
      @keyframes fo_packRay {
        0% { transform: scaleY(0) rotate(var(--rot)); opacity: 0; }
        30% { transform: scaleY(1) rotate(var(--rot)); opacity: 0.8; }
        100% { transform: scaleY(1.5) rotate(var(--rot)); opacity: 0; }
      }
      @keyframes fo_statPop {
        0% { transform: scale(0) translateY(10px); opacity: 0; }
        50% { transform: scale(1.3) translateY(-5px); opacity: 1; }
        70% { transform: scale(0.9) translateY(0); }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      @keyframes fo_statCount {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes fo_statGlow {
        0%, 100% { text-shadow: 0 0 8px rgba(16,185,129,0.3); }
        50% { text-shadow: 0 0 20px rgba(16,185,129,0.8), 0 0 40px rgba(16,185,129,0.4); }
      }
      @keyframes fo_resultFadeIn {
        0% { opacity: 0; transform: translateY(30px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes fo_tierSuccessExplode {
        0% { transform: scale(0); opacity: 1; }
        40% { opacity: 0.9; }
        100% { transform: scale(4); opacity: 0; }
      }
      @keyframes fo_tierStarBurst {
        0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) rotate(720deg) scale(0); opacity: 0; }
      }
      .pack-anim-flip {
        animation: fo_packFlip 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        perspective: 800px;
      }
      .pack-anim-burst {
        animation: fo_packBurst 1s ease-out forwards;
        border-radius: 50%;
        pointer-events: none;
      }
      .pack-anim-sparkle {
        animation: fo_packSparkle 1.2s ease-out forwards;
        pointer-events: none;
      }
      .pack-anim-ray {
        animation: fo_packRay 1.5s ease-out forwards;
        pointer-events: none;
      }
      .pack-stat-pop {
        animation: fo_statPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      .pack-stat-glow {
        animation: fo_statGlow 2s ease-in-out infinite;
      }
      .pack-result-fade {
        animation: fo_resultFadeIn 0.5s ease-out both;
      }
      .tier-success-explode {
        animation: fo_tierSuccessExplode 1.2s ease-out forwards;
        pointer-events: none;
      }
      .tier-star-burst {
        animation: fo_tierStarBurst 1.5s ease-out forwards;
        pointer-events: none;
      }

      /* ===== MOBILE RESPONSIVE ===== */
      .mycard-preview-wrap {
        transform-origin: top center;
      }
      .pitch-card-wrap {
        transform: scale(0.55);
        transform-origin: center center;
        margin: -77px -54px;
      }
      .pitch-empty {
        width: 110px;
        height: 155px;
      }
      @media (max-width: 640px) {
        .mycard-preview-wrap {
          transform: scale(0.78);
          margin-bottom: -75px;
        }
        .pitch-card-wrap {
          transform: scale(0.32);
          margin: -115px -82px;
        }
        .pitch-empty {
          width: 56px;
          height: 80px;
        }
        .pitch-empty .pitch-empty-icon {
          width: 24px;
          height: 24px;
        }
        .pitch-empty .pitch-empty-icon span {
          font-size: 9px;
        }
        .pitch-empty .pitch-empty-label {
          display: none;
        }
        .lineup-stat-cell {
          padding-left: 8px !important;
          padding-right: 8px !important;
        }
        .lineup-stat-cell .stat-label {
          font-size: 7px !important;
        }
        .lineup-stat-cell .stat-value {
          font-size: 14px !important;
        }
        .rank-lineup-cards {
          gap: 2px !important;
        }
        .rank-lineup-cards .rank-mini-card {
          width: 62px !important;
          height: 88px !important;
        }
        .rank-lineup-cards .rank-mini-card > div {
          transform: scale(0.258) !important;
        }
      }

      /* ===== CARD SHELL ===== */
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

      /* ===== LEFT INFO COLUMN ===== */
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

      /* ===== AVATAR ===== */
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

      /* ===== NAME BAR ===== */
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

      /* ===== DIVIDER ===== */
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

      /* ===== STATS ===== */
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

      /* ===== FOOTER ===== */
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

      /* ===== EFFECT LAYERS ===== */
      .fofx_layer {
        position:absolute; inset:0; pointer-events:none; z-index:6;
        clip-path: polygon(
          50% 0%, 100% 15%,
          100% 85%, 50% 100%,
          0% 85%, 0% 15%
        );
        overflow: hidden;
      }

      /* Glow Pulse */
      .fofx_glow .fo-card-inner {
        box-shadow: 0 0 60px rgba(212,168,67,.5) inset, 0 0 120px rgba(242,217,122,.15) inset;
      }
      .fofx_glow .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background: radial-gradient(circle at 35% 25%, rgba(242,217,122,.6), transparent 50%), radial-gradient(circle at 70% 70%, rgba(212,168,67,.5), transparent 55%);
        animation: fo_pulse 2.4s ease-in-out infinite;
      }

      /* Gold Sparkle */
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
      .fofx_sparkIce {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #e0faff, rgba(186,230,253,.9) 40%, rgba(56,189,248,.35) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_sparkHoly {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #fff, rgba(253,224,71,.9) 40%, rgba(253,224,71,.3) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_sparkInferno {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #fff7f5, rgba(248,113,113,.9) 40%, rgba(249,115,22,.35) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.4s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_sparkHolo {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #e0faff, rgba(34,211,238,.9) 40%, rgba(34,211,238,.3) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.8s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }
      .fofx_sparkShadow {
        position:absolute; width:6px; height:6px; border-radius:1px;
        background: radial-gradient(circle, #f5e9ff, rgba(192,132,252,.9) 40%, rgba(139,92,246,.5) 70%, transparent 85%);
        filter: blur(0);
        animation: fo_float 2.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      }

      /* Pack hex sparkle (Upgrade page) */
      .pack-hex {
        position: relative;
        overflow: hidden;
      }
      .pack-spark {
        position:absolute; width:6px; height:6px; border-radius:1px;
        filter: blur(0);
        animation: fo_float 2.4s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        pointer-events:none;
      }

      /* Ember Flame */
      .fofx_flame .fo-card-inner {
        box-shadow: 0 0 60px rgba(255,120,60,.45) inset, 0 0 100px rgba(255,80,30,.15) inset;
      }
      .fofx_flame .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background:
          radial-gradient(circle at 50% 90%, rgba(255,80,20,.7), transparent 45%),
          radial-gradient(circle at 20% 85%, rgba(255,140,60,.5), transparent 50%),
          radial-gradient(circle at 80% 85%, rgba(255,140,60,.5), transparent 50%),
          radial-gradient(circle at 50% 70%, rgba(255,200,50,.2), transparent 40%);
        mix-blend-mode: screen;
        animation: fo_flicker 1.4s ease-in-out infinite;
      }
      .fofx_ember {
        position:absolute; width:5px; height:12px;
        background: radial-gradient(circle at 50% 15%, #fff 0%, rgba(255,220,120,1) 25%, rgba(255,100,40,.8) 60%, transparent 85%);
        filter: blur(.2px);
        animation: fo_float 1.6s linear infinite;
        opacity:0;
        clip-path: polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%);
      }

      /* Ice Storm */
      .fofx_ice .fo-card-inner {
        box-shadow: 0 0 40px rgba(125,211,252,.35) inset, 0 0 80px rgba(56,189,248,.12) inset;
      }
      .fofx_ice .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background: transparent;
      }
      .fofx_ice .fo-border { border-color: rgba(125,211,252,.8) !important; }
      .fofx_ice .fo-shimmer::after {
        background: linear-gradient(90deg, transparent, rgba(186,230,253,.15), rgba(255,255,255,.2), rgba(186,230,253,.15), transparent) !important;
      }

      /* Shadow Aura */
      .fofx_shadow .fo-card-inner {
        box-shadow: 0 0 40px rgba(168,85,247,.35) inset, 0 0 80px rgba(88,28,135,.2) inset;
      }
      .fofx_shadow .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background: transparent;
      }
      .fofx_shadow .fo-border { border-color: rgba(139,92,246,.7) !important; }
      .fofx_shadowOrb {
        position:absolute; width:10px; height:10px; border-radius:50%;
        background: radial-gradient(circle, rgba(232,200,255,1), rgba(192,132,252,.8) 40%, rgba(139,92,246,.3) 70%, transparent 85%);
        filter: blur(.8px);
        animation: fo_float 2.2s linear infinite;
        opacity:0;
      }

      /* Holy Light */
      .fofx_holy .fo-card-inner {
        box-shadow: 0 0 45px rgba(253,224,71,.35) inset, 0 0 90px rgba(255,255,255,.12) inset;
      }
      .fofx_holy .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background: transparent;
      }
      .fofx_holy .fo-border { border-color: rgba(253,224,71,.8) !important; }

      /* Inferno Burst */
      .fofx_inferno .fo-card-inner {
        box-shadow: 0 0 45px rgba(248,113,113,.4) inset, 0 0 90px rgba(249,115,22,.18) inset;
      }
      .fofx_inferno .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background: transparent;
        mix-blend-mode: screen;
      }
      .fofx_inferno .fo-border { border-color: rgba(239,68,68,.8) !important; }

      /* Electric Glitch */
      .fofx_electric .fo-card-inner {
        box-shadow: 0 0 50px rgba(56,189,248,.4) inset, 0 0 30px rgba(167,139,250,.25) inset;
      }
      .fofx_electric .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background:
          repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(56,189,248,.06) 2px, rgba(56,189,248,.06) 4px);
      }
      .fofx_electric .fofx_layer::after {
        content:""; position:absolute; left:0; right:0; height:3px;
        background: linear-gradient(90deg, transparent, rgba(56,189,248,.9), rgba(167,139,250,.7), rgba(56,189,248,.9), transparent);
        animation: fo_scanline 1.5s linear infinite;
        filter: blur(1px);
        box-shadow: 0 0 12px rgba(56,189,248,.6);
      }
      .fofx_electric .fo-border { border-color: rgba(56,189,248,.7) !important; }
      .fofx_glitchSlice {
        position:absolute; left:0; right:0;
        background: rgba(56,189,248,.15);
        mix-blend-mode: screen;
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

      /* Hologram */
      .fofx_holo .fo-card-inner {
        box-shadow: 0 0 55px rgba(34,211,238,.38) inset, 0 0 95px rgba(59,130,246,.18) inset;
      }
      .fofx_holo .fofx_layer::before {
        content:""; position:absolute; inset:0;
        background: transparent;
      }
      .fofx_holo .fofx_layer::after {
        content:""; position:absolute; left:0; right:0; height:40%;
        background: linear-gradient(180deg, transparent, rgba(34,211,238,.12), transparent);
        animation: fo_holoScan 2s linear infinite;
      }
      .fofx_holo .fo-border { border-color: rgba(34,211,238,.6) !important; }
      .fofx_holo .fo-card-inner::after {
        background:
          linear-gradient(145deg, transparent 48%, rgba(34,211,238,.1) 49%, rgba(34,211,238,.1) 50%, transparent 51%) !important;
      }

      /* ===== CARD TIER COLORS ===== */
      /* Silver: <61 */
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

      /* Gold: 61-70 */
      .fo-tier-gold .fo-card-inner::before {
        background: linear-gradient(145deg, var(--fo-gold) 0%, var(--fo-gold-dark) 60%, #4a3510 100%);
      }

      /* Diamond: 71-80 */
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

      /* Ruby: 81+ */
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
    `}</style>
  );
}

// ================= COMPONENTS =================

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

type PillNavButtonProps = {
  value: string;
  label: string;
  tab: string;
  setTab: (t: string) => void;
};

function PillNavButton({ value, label, tab, setTab, icon }: PillNavButtonProps & { icon?: React.ReactNode }) {
  return (
    <button
      onClick={() => setTab(value)}
      className={`glass-nav-btn ${tab === value ? "active" : ""}`}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

function PillNav({ tab, setTab, isAdmin }: { tab: string; setTab: (t: string) => void; isAdmin: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleNav = (v: string) => { setTab(v); setMobileOpen(false); };

  const navItems: { value: string; label: string; icon?: React.ReactNode }[] = [
    { value: "my", label: "MY CARD", icon: <Star className="w-3.5 h-3.5" /> },
    { value: "collection", label: "COLLECTION", icon: <Gem className="w-3.5 h-3.5" /> },
    { value: "gallery", label: "GALLERY", icon: <Users className="w-3.5 h-3.5" /> },
    { value: "topup", label: "NẠP THẺ", icon: <Coins className="w-3.5 h-3.5" /> },
    { value: "lineup", label: "LINEUP", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "market", label: "MARKET", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { value: "upgrade", label: "UPGRADE", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "hax", label: "HAXBALL" },
    { value: "battlepass", label: "BATTLE PASS", icon: <Trophy className="w-3.5 h-3.5" /> },
    { value: "rank", label: "RANK", icon: <Trophy className="w-3.5 h-3.5" /> },
    { value: "how", label: "HOW TO PLAY", icon: <HelpCircle className="w-3.5 h-3.5" /> },
    ...(isAdmin ? [{ value: "admin", label: "ADMIN", icon: <Lock className="w-3.5 h-3.5" /> }] : []),
  ];

  const activeItem = navItems.find(n => n.value === tab);

  return (
    <>
      {/* Desktop nav */}
      <div className="glass-nav rounded-2xl px-3 py-2.5 mx-auto max-w-fit hidden sm:block">
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {navItems.map((n) => (
            <PillNavButton key={n.value} value={n.value} label={n.label} tab={tab} setTab={setTab} icon={n.icon} />
          ))}
        </div>
      </div>

      {/* Mobile hamburger */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="glass-nav rounded-xl px-4 py-2.5 flex items-center gap-2 mx-auto"
        >
          <Menu className="w-4 h-4 text-amber-200/70" />
          <span className="text-sm font-bold text-amber-100/90">{activeItem?.label ?? "MENU"}</span>
        </button>

        {mobileOpen && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
            <div className="modal-content max-w-xs" style={{ padding: 16 }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-extrabold text-amber-100 tracking-wide">MENU</span>
                <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
                  <X className="w-4 h-4 text-amber-200/60" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {navItems.map((n) => (
                  <button
                    key={n.value}
                    onClick={() => handleNav(n.value)}
                    className={
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all " +
                      (tab === n.value
                        ? "bg-[#c6a96b]/15 text-[#f2d97a] border border-[#c6a96b]/20"
                        : "text-amber-100/70 hover:bg-white/5 border border-transparent")
                    }
                  >
                    {n.icon && <span className="opacity-70">{n.icon}</span>}
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ================= GALLERY (PUBLIC USER CARDS) =================
type GalleryUser = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  cardCount: number;
};

function GalleryPage() {
  const [users, setUsers] = useState<GalleryUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<GalleryUser | null>(null);
  const [selectedUserCards, setSelectedUserCards] = useState<CardItem[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api<{ users?: GalleryUser[]; error?: string }>("/api/gallery");
        if (res.error) {
          setError(res.error);
        } else if (Array.isArray(res.users)) {
          setUsers(res.users);
          if (res.users.length > 0) {
            setSelectedUser(res.users[0]);
          }
        }
      } catch {
        setError("Không tải được danh sách gallery");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedUser) {
        setSelectedUserCards([]);
        return;
      }
      setCardsLoading(true);
      try {
        const res = await api<{ cards: any[]; error?: string }>(`/api/cards?ownerId=${selectedUser.id}`);
        if (res.error) {
          setSelectedUserCards([]);
        } else if (Array.isArray(res.cards)) {
          setSelectedUserCards(res.cards.map((c) => dbCardToFrontend(c)));
        } else {
          setSelectedUserCards([]);
        }
      } catch {
        setSelectedUserCards([]);
      } finally {
        setCardsLoading(false);
      }
    })();
  }, [selectedUser]);

  if (loading) {
    return <div className="text-center py-10 text-amber-100/70 text-sm">Đang tải gallery...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-400 text-sm">{error}</div>;
  }

  if (users.length === 0) {
    return <div className="text-center py-10 text-amber-100/70 text-sm">Chưa có user nào sở hữu thẻ.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-extrabold">GALLERY - Bộ sưu tập của mọi người</div>
        <div className="text-xs text-amber-200/60 mt-1">
          Hiển thị tất cả thẻ của user gallery.
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-64 flex-shrink-0">
          <div className="border border-white/10 rounded-xl bg-[#1d1512]/80 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/10 space-y-1.5">
              <div className="text-xs font-bold text-amber-100/70">
                Người chơi ({users.length})
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-100/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên..."
                  className="w-full bg-[#251b17] border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-amber-50 placeholder:text-amber-100/30 outline-none focus:border-[#c6a96b]/50"
                />
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {users
              .filter((u) => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (
                  u.username.toLowerCase().includes(q) ||
                  u.displayName.toLowerCase().includes(q)
                );
              })
              .map((u) => {
                const active = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs border-b border-white/5 last:border-b-0 " +
                      (active ? "bg-[#c6a96b]/15 text-amber-50" : "hover:bg-white/5 text-amber-100/80")
                    }
                  >
                    <div className="w-9 h-9 rounded-full bg-[#2a1f1b] flex items-center justify-center overflow-hidden text-[11px] font-bold text-amber-100/80">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                      ) : (
                        (u.displayName?.[0] ?? u.username[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{u.displayName}</div>
                      <div className="text-[10px] text-amber-100/50 truncate">@{u.username}</div>
                    </div>
                    <div className="text-[10px] text-amber-100/60 whitespace-nowrap">
                      {u.cardCount} thẻ
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {selectedUser && (
            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2a1f1b] flex items-center justify-center overflow-hidden text-xs font-bold text-amber-100/80">
                {selectedUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedUser.avatarUrl} alt={selectedUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  (selectedUser.displayName?.[0] ?? selectedUser.username[0] ?? "?").toUpperCase()
                )}
              </div>
              <div>
                <div className="text-sm font-bold">{selectedUser.displayName}</div>
                <div className="text-[11px] text-amber-100/60">@{selectedUser.username} • {selectedUser.cardCount} thẻ</div>
              </div>
            </div>
          )}

          {cardsLoading ? (
            <div className="text-sm text-amber-100/70">Đang tải thẻ của user...</div>
          ) : selectedUserCards.length === 0 ? (
            <div className="text-sm text-amber-100/70">User này chưa có thẻ để hiển thị.</div>
          ) : (
            <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
              {selectedUserCards.map((c) => (
                <div
                  key={c.id}
                  className="flex-shrink-0"
                >
                  <CardPreview item={c} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

function CardPreview({ item, avatarText, avatarStyleOverride }: {
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
  );
}

// ================= RANK PAGE =================
function RankPage({ currentUserId }: { currentUserId: number }) {
  const [subTab, setSubTab] = useState<"elo" | "lineup">("elo");

  // --- ELO rank ---
  const [eloEntries, setEloEntries] = useState<
    { rank: number; username: string; userId: number; elo: number }[]
  >([]);
  const [eloLoading, setEloLoading] = useState(true);
  const [eloPage, setEloPage] = useState(1);
  const ELO_PER_PAGE = 20;

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/rank");
        if (Array.isArray(data.leaderboard)) {
          setEloEntries(
            data.leaderboard.slice(0, 100).map((e: any, i: number) => ({
              rank: i + 1,
              username: e.username,
              userId: e.userId,
              elo: e.card?.owner?.elo ?? e.elo ?? 1000,
            }))
          );
        }
      } catch { /* ignore */ }
      setEloLoading(false);
    })();
  }, []);

  // --- Lineup rank ---
  const [lineupEntries, setLineupEntries] = useState<
    { rank: number; username: string; userId: number; lineupElo: number; avgOvr: number; avgAtk: number; avgDef: number; avgPas: number; avgImp: number; cards: any[] }[]
  >([]);
  const [lineupLoading, setLineupLoading] = useState(true);
  const [lineupPage, setLineupPage] = useState(1);
  const LINEUP_PER_PAGE = 10;

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/lineup/rank");
        if (Array.isArray(data)) {
          setLineupEntries(
            data.slice(0, 30).map((e: any, i: number) => ({ ...e, rank: i + 1 }))
          );
        }
      } catch { /* ignore */ }
      setLineupLoading(false);
    })();
  }, []);

  const getEloClass = (elo: number) => {
    if (elo >= 1500) return "elo-master";
    if (elo >= 1300) return "elo-diamond";
    if (elo >= 1100) return "elo-gold";
    if (elo >= 900) return "elo-silver";
    return "elo-bronze";
  };

  const getEloLabel = (elo: number) => {
    if (elo >= 1500) return "MASTER";
    if (elo >= 1300) return "DIAMOND";
    if (elo >= 1100) return "GOLD";
    if (elo >= 900) return "SILVER";
    return "BRONZE";
  };

  const getMedalClass = (rank: number) => {
    if (rank === 1) return "medal-1";
    if (rank === 2) return "medal-2";
    if (rank === 3) return "medal-3";
    return "";
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f2d97a] to-[#8b6914] flex items-center justify-center shadow-lg shadow-[#d4a843]/20">
          <Trophy className="w-5 h-5 text-[#1a1412]" />
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-wide">RANKING</span>
          <div className="text-[10px] text-amber-200/40 tracking-widest uppercase">Bảng xếp hạng Star Team</div>
        </div>
      </div>

      {/* Sub-tabs + Your Rank */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="glass-nav rounded-xl p-1 inline-flex gap-1">
          <button
            onClick={() => setSubTab("elo")}
            className={`glass-nav-btn ${subTab === "elo" ? "active" : ""}`}
          >
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Rank Cá nhân (ELO)
            </span>
          </button>
          <button
            onClick={() => setSubTab("lineup")}
            className={`glass-nav-btn ${subTab === "lineup" ? "active" : ""}`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Rank Đội hình (Lineup)
            </span>
          </button>
        </div>
        {eloEntries.some(e => e.userId === currentUserId) && (
          <button
            onClick={() => {
              const idx = eloEntries.findIndex(e => e.userId === currentUserId);
              if (idx === -1) return;
              const page = Math.floor(idx / ELO_PER_PAGE) + 1;
              setSubTab("elo");
              setEloPage(page);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#c6a96b]/15 border border-[#c6a96b]/40 text-[#f2d97a] hover:bg-[#c6a96b]/25 transition"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#f2d97a] to-[#8b6914] flex items-center justify-center text-[9px]">
              ★
            </span>
            YOUR RANK
          </button>
        )}
      </div>

      {/* ELO Rank */}
      {subTab === "elo" && (
        <div className="space-y-4">
          <div className="text-xs text-amber-100/40 tracking-wide">Xếp hạng theo ELO — đá Haxball để tăng ELO.</div>
          {eloLoading ? (
            <div className="text-center text-sm text-amber-100/60 py-10">Đang tải...</div>
          ) : eloEntries.length === 0 ? (
            <div className="text-center text-sm text-amber-100/40 py-10">Chưa có dữ liệu ELO</div>
          ) : (() => {
            const totalEloPages = Math.max(1, Math.ceil(eloEntries.length / ELO_PER_PAGE));
            const clampedEloPage = Math.min(eloPage, totalEloPages);
            const paginatedElo = eloEntries.slice((clampedEloPage - 1) * ELO_PER_PAGE, clampedEloPage * ELO_PER_PAGE);
            return (<>
            <div className="glass-panel overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[60px_1fr_80px] gap-2 px-5 py-3 text-[10px] font-bold text-amber-200/40 tracking-widest uppercase border-b border-white/5">
                <div>Hạng</div>
                <div>Người chơi</div>
                <div className="text-right">ELO</div>
              </div>
              {paginatedElo.map((e) => (
                <div
                  key={e.userId}
                  className={
                    "grid grid-cols-[60px_1fr_80px] gap-2 px-5 py-3.5 items-center border-b border-white/[.03] last:border-b-0 transition-colors hover:bg-white/[.02] " +
                    (e.userId === currentUserId
                      ? "bg-[#c6a96b]/[.06] border-[#c6a96b]/60 shadow-[0_0_14px_rgba(198,169,107,0.45)]"
                      : e.rank === 1
                      ? "border-[#fbbf24]/40"
                      : e.rank === 2
                      ? "border-[#93c5fd]/40"
                      : e.rank === 3
                      ? "border-[#fca5a5]/40"
                      : "")
                  }
                >
                  <div>
                    {e.rank <= 3 ? (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${getMedalClass(e.rank)}`}>
                        {e.rank}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white/30 bg-white/[.04] border border-white/[.06]">
                        {e.rank}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={"text-sm font-bold " + (e.rank <= 3 ? "text-amber-50" : "text-amber-100/80")}>
                        {e.username}
                      </span>
                      {e.userId === currentUserId && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#fef3c7] bg-[#c6a96b]/30 px-1.5 py-0.5 rounded-full tracking-wider shadow-[0_0_10px_rgba(198,169,107,0.65)]">
                          <span>★</span>
                          <span>BẠN</span>
                        </span>
                      )}
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/[.02] border border-white/[.06] " +
                          getEloClass(e.elo)
                        }
                      >
                        <span className="tracking-widest">
                          {getEloLabel(e.elo)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className={`text-right text-sm font-black tabular-nums ${getEloClass(e.elo)}`}>
                    {e.elo}
                  </div>
                </div>
              ))}
            </div>
            {totalEloPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setEloPage(p => Math.max(1, p - 1))} disabled={clampedEloPage <= 1} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2a1f1b] border border-white/10 text-amber-200/70 hover:bg-[#3b2b23] disabled:opacity-30 disabled:cursor-not-allowed transition">←</button>
                {Array.from({ length: totalEloPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setEloPage(p)} className={"px-3 py-1.5 rounded-lg text-xs font-bold border transition " + (p === clampedEloPage ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]" : "bg-[#2a1f1b] text-amber-200/70 border-white/10 hover:bg-[#3b2b23]")}>{p}</button>
                ))}
                <button onClick={() => setEloPage(p => Math.min(totalEloPages, p + 1))} disabled={clampedEloPage >= totalEloPages} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2a1f1b] border border-white/10 text-amber-200/70 hover:bg-[#3b2b23] disabled:opacity-30 disabled:cursor-not-allowed transition">→</button>
                <span className="text-[10px] text-white/25 ml-2">{eloEntries.length} người</span>
              </div>
            )}
            </>);
          })()}
        </div>
      )}

      {/* Lineup Rank */}
      {subTab === "lineup" && (
        <div className="space-y-3">
          <div className="text-xs text-amber-100/40 tracking-wide">Xếp hạng theo ELO đội hình — thắng trận Thi Đấu để tăng ELO.</div>
          {lineupLoading ? (
            <div className="text-center text-sm text-amber-100/60 py-10">Đang tải...</div>
          ) : lineupEntries.length === 0 ? (
            <div className="text-center text-sm text-amber-100/40 py-10">Chưa có ai lưu đội hình đủ 5 người</div>
          ) : (() => {
            const totalLineupPages = Math.max(1, Math.ceil(lineupEntries.length / LINEUP_PER_PAGE));
            const clampedLineupPage = Math.min(lineupPage, totalLineupPages);
            const paginatedLineup = lineupEntries.slice((clampedLineupPage - 1) * LINEUP_PER_PAGE, clampedLineupPage * LINEUP_PER_PAGE);
            return (<>
            <div className="glass-panel overflow-hidden">
              {paginatedLineup.map((e) => (
                <div key={e.userId} className={"px-4 py-3 border-b border-white/[.03] last:border-b-0 transition-colors hover:bg-white/[.02] " + (e.userId === currentUserId ? "bg-[#c6a96b]/[.06]" : "")}>
                  {/* Top row: rank + name + OVR */}
                  <div className="flex items-center gap-3 mb-2">
                    {e.rank <= 3 ? (
                      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black ${getMedalClass(e.rank)}`}>
                        {e.rank}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white/25 bg-white/[.03] border border-white/[.05]">
                        {e.rank}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={"text-sm font-bold truncate " + (e.rank <= 3 ? "text-amber-50" : "text-amber-100/80")}>{e.username}</span>
                        {e.userId === currentUserId && (
                          <span className="text-[8px] font-bold text-[#c6a96b] bg-[#c6a96b]/10 px-1 py-0.5 rounded tracking-wider">BẠN</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {[
                          { l: "ATK", v: e.avgAtk },
                          { l: "DEF", v: e.avgDef },
                          { l: "PAS", v: e.avgPas },
                          { l: "IMP", v: e.avgImp },
                        ].map((s) => (
                          <span key={s.l} className="text-[9px] text-white/30">
                            <span className="font-bold tracking-wider">{s.l}</span>{" "}<span className="text-white/50 font-black">{s.v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#c6a96b]/10 border border-[#c6a96b]/15">
                      <span className="text-[7px] font-bold text-[#f2d97a]/60 tracking-widest">ELO</span>
                      <span className="text-lg font-black text-[#f2d97a] leading-none">{e.lineupElo}</span>
                      <span className="text-[8px] text-white/25 mt-0.5">OVR {e.avgOvr}</span>
                    </div>
                  </div>
                  {/* Bottom row: 5 mini cards */}
                  <div className="rank-lineup-cards flex items-center justify-center gap-1.5">
                    {e.cards.map((c: any, idx: number) => {
                      const card = dbCardToFrontend(c, currentUserId);
                      return (
                        <div key={idx} className="rank-mini-card rounded-lg overflow-hidden flex-shrink-0" style={{ width: 108, height: 153 }}>
                          <div style={{ transform: "scale(0.45)", transformOrigin: "top left", width: 240, height: 340 }}>
                            <CardPreview item={card} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {totalLineupPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setLineupPage(p => Math.max(1, p - 1))} disabled={clampedLineupPage <= 1} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2a1f1b] border border-white/10 text-amber-200/70 hover:bg-[#3b2b23] disabled:opacity-30 disabled:cursor-not-allowed transition">←</button>
                {Array.from({ length: totalLineupPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setLineupPage(p)} className={"px-3 py-1.5 rounded-lg text-xs font-bold border transition " + (p === clampedLineupPage ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]" : "bg-[#2a1f1b] text-amber-200/70 border-white/10 hover:bg-[#3b2b23]")}>{p}</button>
                ))}
                <button onClick={() => setLineupPage(p => Math.min(totalLineupPages, p + 1))} disabled={clampedLineupPage >= totalLineupPages} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2a1f1b] border border-white/10 text-amber-200/70 hover:bg-[#3b2b23] disabled:opacity-30 disabled:cursor-not-allowed transition">→</button>
                <span className="text-[10px] text-white/25 ml-2">{lineupEntries.length} đội</span>
              </div>
            )}
            </>);
          })()}
        </div>
      )}
    </div>
  );
}

// ================= COLOR PICKER =================
// ================= HOME (LINEUP BUILDER) =================
function PitchSlot({ pos, assigned, isSelecting, onClick }: {
  pos: string;
  assigned: CardItem | null;
  isSelecting: boolean;
  onClick: () => void;
}) {
  if (assigned) {
    return (
      <div onClick={onClick} className={"cursor-pointer transition-all " + (isSelecting ? "scale-105" : "hover:scale-[1.03]")}>
        <div className="pitch-card-wrap relative">
          <CardPreview item={assigned} />
          {isSelecting && (
            <div className="absolute inset-0 rounded-xl ring-2 ring-[#c6a96b] ring-offset-2 ring-offset-transparent pointer-events-none" />
          )}
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      className={
        "pitch-empty rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all " +
        (isSelecting
          ? "border-[#c6a96b] bg-[#c6a96b]/10"
          : "border-white/15 bg-white/5 hover:border-white/25 hover:bg-white/8")
      }
    >
      <div className="pitch-empty-icon w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
        <span className="text-sm font-extrabold text-white/60">{pos}</span>
      </div>
      <span className="pitch-empty-label text-[10px] font-bold text-white/30 uppercase tracking-wider">Chọn thẻ</span>
    </button>
  );
}

function HomePage({ myCards, userId, onRefresh }: { myCards: CardItem[]; userId: number; onRefresh: () => void }) {
  const [formation, setFormation] = useState<Formation>("1-2-1");
  const formationConfig: Record<Formation, { def: number; mid: number; att: number }> = {
    "1-2-1": { def: 2, mid: 1, att: 1 },
    "2-2": { def: 2, mid: 0, att: 2 },
    "3-1": { def: 3, mid: 0, att: 1 },
    "4-0": { def: 4, mid: 0, att: 0 },
  };
  const { def, mid, att } = formationConfig[formation];
  const slotPositions: Position[] = [
    "GK",
    ...Array(def).fill("CB"),
    ...Array(mid).fill("CM"),
    ...Array(att).fill("ST"),
  ];
  const slots: { pos: Position; label: string }[] = slotPositions.map((pos) => ({ pos, label: pos }));
  const [lineup, setLineup] = useState<Record<number, CardItem | null>>({});
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Battle states
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleData, setBattleData] = useState<any>(null);
  const [battleEventIdx, setBattleEventIdx] = useState(0);
  const [battleBallPos, setBattleBallPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [battleFinished, setBattleFinished] = useState(false);
  // Dynamic player positions
  const homeBase = [
    { x: 8, y: 50 },   // GK
    { x: 22, y: 30 },  // CB
    { x: 22, y: 70 },  // CB
    { x: 36, y: 50 },  // CM
    { x: 46, y: 50 },  // ST
  ];
  const awayBase = [
    { x: 92, y: 50 },  // GK
    { x: 78, y: 30 },  // CB
    { x: 78, y: 70 },  // CB
    { x: 64, y: 50 },  // CM
    { x: 54, y: 50 },  // ST
  ];
  const [homePositions, setHomePositions] = useState(homeBase);
  const [awayPositions, setAwayPositions] = useState(awayBase);
  const [activePlayer, setActivePlayer] = useState<{ team: "home" | "away"; index: number } | null>(null);
  const [goalFlash, setGoalFlash] = useState<"home" | "away" | null>(null);

  // Khi đổi sơ đồ (formation), giữ nguyên GK nhưng reset 4 vị trí còn lại
  useEffect(() => {
    setLineup((prev) => {
      const next: Record<number, CardItem | null> = {};
      if (prev[0]) next[0] = prev[0]; // slot 0 = GK
      return next;
    });
    setSelectingSlot(null);
  }, [formation]);

  // Load saved lineup on mount
  useEffect(() => {
    if (!userId || loadedOnce) return;
    (async () => {
      try {
        const saved = await api("/api/lineup");
        if (Array.isArray(saved)) {
          const map: Record<number, CardItem | null> = {};
          for (const s of saved) {
            const card = myCards.find(c => c.id === (s.cardId ?? s.card?.id));
            if (card) map[s.slotIndex] = card;
          }
          setLineup(map);
        }
      } catch { /* ignore */ }
      setLoadedOnce(true);
    })();
  }, [userId, myCards, loadedOnce]);

  const assignCard = (card: CardItem) => {
    if (selectingSlot === null) return;
    setLineup({ ...lineup, [selectingSlot]: card });
    setSelectingSlot(null);
  };

  const removeCard = (idx: number) => {
    const next = { ...lineup };
    delete next[idx];
    setLineup(next);
    setSelectingSlot(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const slotsData = slots.map((_, i) => ({
        slotIndex: i,
        cardId: lineup[i]?.id ?? null,
      }));
      const res = await api("/api/lineup", { method: "PUT", body: JSON.stringify({ slots: slotsData }) });
      if (res.error) {
        setSaveMsg(res.error);
      } else {
        setSaveMsg("Đã lưu đội hình!");
        setTimeout(() => setSaveMsg(null), 2500);
      }
    } catch {
      setSaveMsg("Lỗi khi lưu, thử lại sau");
    } finally {
      setSaving(false);
    }
  };

  // ---- Battle handler ----
  const handleBattle = async () => {
    setBattleLoading(true);
    setBattleData(null);
    setBattleEventIdx(0);
    setBattleFinished(false);
    setBattleBallPos({ x: 50, y: 50 });
    setHomePositions(homeBase);
    setAwayPositions(awayBase);
    setActivePlayer(null);
    setGoalFlash(null);
    try {
      const res = await fetch("/api/lineup/battle", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Lỗi khi thi đấu");
        setBattleLoading(false);
        return;
      }
      setBattleData(data);
      setBattleEventIdx(0);
    } catch {
      alert("Lỗi kết nối server");
    } finally {
      setBattleLoading(false);
    }
  };

  // Auto-play battle events with player movement
  useEffect(() => {
    if (!battleData || battleFinished) return;
    const events = battleData.events as { minute: number; type: string; team: string; player?: string }[];
    if (battleEventIdx >= events.length) {
      setBattleFinished(true);
      setActivePlayer(null);
      setHomePositions(homeBase);
      setAwayPositions(awayBase);
      return;
    }
    const ev = events[battleEventIdx];
    const isHome = ev.team === "home";

    // Find which player is active (by name)
    let activeIdx = -1;
    const teamCards = isHome ? battleData.home.cards : battleData.away.cards;
    if (ev.player && teamCards) {
      activeIdx = teamCards.findIndex((c: any) => c.name === ev.player);
    }
    if (activeIdx === -1 && ev.type !== "kickoff" && ev.type !== "halftime" && ev.type !== "end") {
      activeIdx = ev.type === "save" ? 0 : ev.type === "attack" ? (Math.random() > 0.5 ? 1 : 2) : 4;
    }

    // Set active player highlight
    if (activeIdx >= 0 && ev.type !== "kickoff" && ev.type !== "halftime" && ev.type !== "end") {
      setActivePlayer({ team: isHome ? "home" : "away", index: activeIdx });
    } else {
      setActivePlayer(null);
    }

    // Goal flash
    if (ev.type === "goal") {
      setGoalFlash(isHome ? "home" : "away");
      setTimeout(() => setGoalFlash(null), 1500);
    }

    // Move ball
    const r = () => Math.random();
    const ballPosMap: Record<string, { x: number; y: number }> = {
      kickoff: { x: 50, y: 50 },
      goal: isHome ? { x: 92, y: 40 + r() * 20 } : { x: 8, y: 40 + r() * 20 },
      save: isHome ? { x: 88, y: 45 + r() * 10 } : { x: 12, y: 45 + r() * 10 },
      miss: isHome ? { x: 95, y: 20 + r() * 60 } : { x: 5, y: 20 + r() * 60 },
      attack: isHome ? { x: 68 + r() * 12, y: 30 + r() * 40 } : { x: 20 + r() * 12, y: 30 + r() * 40 },
      pass: isHome ? { x: 38 + r() * 20, y: 25 + r() * 50 } : { x: 42 + r() * 20, y: 25 + r() * 50 },
      counter: isHome ? { x: 60 + r() * 10, y: 35 + r() * 30 } : { x: 30 + r() * 10, y: 35 + r() * 30 },
      halftime: { x: 50, y: 50 },
      end: { x: 50, y: 50 },
    };
    const ballTarget = ballPosMap[ev.type] ?? { x: 50, y: 50 };
    setBattleBallPos(ballTarget);

    // Move players based on event type
    const jitter = (base: number, range: number) => base + (r() - 0.5) * range;
    const newHome = homeBase.map((b, i) => {
      if (ev.type === "halftime" || ev.type === "end" || ev.type === "kickoff") return b;
      const isAttacking = isHome;
      const shift = isAttacking ? 8 : -3;
      // Active player moves toward ball
      if (isHome && i === activeIdx) {
        return { x: Math.min(92, ballTarget.x - 3 + r() * 4), y: ballTarget.y + (r() - 0.5) * 10 };
      }
      return {
        x: jitter(b.x + shift + (ev.type === "goal" && isHome ? 6 : 0), 5),
        y: jitter(b.y, 8),
      };
    });
    const newAway = awayBase.map((b, i) => {
      if (ev.type === "halftime" || ev.type === "end" || ev.type === "kickoff") return b;
      const isAttacking = !isHome;
      const shift = isAttacking ? -8 : 3;
      // Active player moves toward ball
      if (!isHome && i === activeIdx) {
        return { x: Math.max(8, ballTarget.x + 3 - r() * 4), y: ballTarget.y + (r() - 0.5) * 10 };
      }
      return {
        x: jitter(b.x + shift + (ev.type === "goal" && !isHome ? -6 : 0), 5),
        y: jitter(b.y, 8),
      };
    });
    setHomePositions(newHome);
    setAwayPositions(newAway);

    const delay = ev.type === "goal" ? 2800 : ev.type === "halftime" || ev.type === "end" ? 2200 : 1600;
    const timer = setTimeout(() => setBattleEventIdx(i => i + 1), delay);
    return () => clearTimeout(timer);
  }, [battleData, battleEventIdx, battleFinished]);

  const closeBattle = () => {
    setBattleData(null);
    setBattleEventIdx(0);
    setBattleFinished(false);
    setActivePlayer(null);
    setGoalFlash(null);
    onRefresh();
  };

  const selectedSlotPos = selectingSlot !== null ? slots[selectingSlot].pos : null;
  const usedCardIds = new Set(
    Object.entries(lineup)
      .filter(([idx]) => Number(idx) !== selectingSlot)
      .map(([, c]) => c?.id)
      .filter(Boolean)
  );
  const availableCards = selectedSlotPos
    ? myCards.filter((c) => c.position === selectedSlotPos && !usedCardIds.has(c.id))
    : [];

  const filledCards = Object.values(lineup).filter(Boolean) as CardItem[];
  const filledCount = filledCards.length;
  const avgOvr = filledCount > 0 ? Math.round(filledCards.reduce((s, c) => s + c.rating, 0) / filledCount) : 0;
  const avgAtk = filledCount > 0 ? Math.round(filledCards.reduce((s, c) => s + c.atk, 0) / filledCount) : 0;
  const avgDef = filledCount > 0 ? Math.round(filledCards.reduce((s, c) => s + c.def, 0) / filledCount) : 0;
  const avgPas = filledCount > 0 ? Math.round(filledCards.reduce((s, c) => s + c.pas, 0) / filledCount) : 0;
  const avgImp = filledCount > 0 ? Math.round(filledCards.reduce((s, c) => s + c.imp, 0) / filledCount) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 justify-center">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f2d97a] to-[#8b6914] flex items-center justify-center shadow-lg shadow-[#d4a843]/20">
          <Sparkles className="w-4.5 h-4.5 text-[#1a1412]" />
        </div>
        <span className="text-xl font-extrabold tracking-wide">LINEUP</span>
      </div>

      {/* Stats bar */}
      {filledCount > 0 && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-white/[.06] bg-black/30 backdrop-blur-sm">
            {[
              { label: "ATK", value: avgAtk, highlight: false },
              { label: "DEF", value: avgDef, highlight: false },
              { label: "OVR", value: avgOvr, highlight: true },
              { label: "PAS", value: avgPas, highlight: false },
              { label: "IMP", value: avgImp, highlight: false },
            ].map((s) => (
              <div
                key={s.label}
                className={
                  "lineup-stat-cell flex flex-col items-center px-3 sm:px-5 py-2 " +
                  (s.highlight ? "bg-[#c6a96b]/15" : "")
                }
              >
                <span className={"stat-label text-[9px] font-bold tracking-widest " + (s.highlight ? "text-[#f2d97a]" : "text-white/30")}>{s.label}</span>
                <span className={"stat-value text-lg font-black " + (s.highlight ? "text-[#f2d97a]" : "text-white/70")}>{s.value}</span>
              </div>
            ))}
          </div>
          <span className="text-[9px] text-white/20 font-bold tracking-[.2em] uppercase">{filledCount}/5 vị trí</span>
        </div>
      )}

      {/* Formation selector */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-white/60 font-semibold">
        <span className="uppercase tracking-[0.18em] text-white/30">Sơ đồ</span>
        {(["1-2-1", "2-2", "3-1", "4-0"] as Formation[]).map((f) => (
          <button
            key={f}
            onClick={() => setFormation(f)}
            className={
              "px-2.5 py-1 rounded-full border text-[11px] transition " +
              (formation === f
                ? "border-[#f2d97a] bg-[#f2d97a]/15 text-[#f2d97a]"
                : "border-white/10 bg-black/30 hover:border-white/25 hover:bg-black/40 text-white/55")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Pitch */}
      <div
        className="relative rounded-2xl overflow-hidden mx-auto aspect-[4/3] sm:aspect-[16/9]"
        style={{
          width: "100%",
          maxWidth: 900,
          background: "linear-gradient(180deg, #1a3a1a 0%, #1e4420 30%, #1a3a1a 100%)",
        }}
      >
        {/* Pitch markings */}
        <svg viewBox="0 0 900 506" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {/* Border */}
          <rect x="30" y="20" width="840" height="466" rx="4" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="2" />
          {/* Center line */}
          <line x1="450" y1="20" x2="450" y2="486" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          {/* Center circle */}
          <circle cx="450" cy="253" r="70" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          <circle cx="450" cy="253" r="4" fill="rgba(255,255,255,.15)" />
          {/* Left penalty area */}
          <rect x="30" y="133" width="120" height="240" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          <rect x="30" y="193" width="50" height="120" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" />
          {/* Right penalty area */}
          <rect x="750" y="133" width="120" height="240" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2" />
          <rect x="820" y="193" width="50" height="120" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" />
          {/* Penalty arcs */}
          <path d="M 150 200 A 50 50 0 0 1 150 306" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.5" />
          <path d="M 750 200 A 50 50 0 0 0 750 306" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.5" />
          {/* Grass stripes */}
          {[0,1,2,3,4,5,6,7].map(i => (
            <rect key={i} x={30 + i * 105} y="20" width="105" height="466" fill={i % 2 === 0 ? "rgba(255,255,255,.015)" : "transparent"} />
          ))}
        </svg>

        {/* Formation layout (horizontal pitch, left=GK, right=ST) */}
        <div className="absolute inset-0 flex items-center justify-between" style={{ padding: "0 4% 0 2%" }}>
          {/* GK */}
          <div className="flex items-center justify-center" style={{ width: "20%" }}>
            <PitchSlot
              pos="GK"
              assigned={lineup[0] ?? null}
              isSelecting={selectingSlot === 0}
              onClick={() => setSelectingSlot(selectingSlot === 0 ? null : 0)}
            />
          </div>

          {/* DEF block */}
          <div className="flex flex-col items-center gap-1" style={{ width: "20%" }}>
            {Array.from({ length: def }).map((_, idx) => {
              const slotIdx = 1 + idx;
              return (
            <PitchSlot
                  key={slotIdx}
              pos="CB"
                  assigned={lineup[slotIdx] ?? null}
                  isSelecting={selectingSlot === slotIdx}
                  onClick={() => setSelectingSlot(selectingSlot === slotIdx ? null : slotIdx)}
            />
              );
            })}
          </div>

          {/* MID block */}
          <div className="flex items-center justify-center" style={{ width: "20%" }}>
            {mid > 0 && (
              <div className={mid > 1 ? "flex flex-col items-center gap-1" : ""}>
                {Array.from({ length: mid }).map((_, idx) => {
                  const slotIdx = 1 + def + idx;
                  return (
            <PitchSlot
                      key={slotIdx}
              pos="CM"
                      assigned={lineup[slotIdx] ?? null}
                      isSelecting={selectingSlot === slotIdx}
                      onClick={() => setSelectingSlot(selectingSlot === slotIdx ? null : slotIdx)}
            />
                  );
                })}
              </div>
            )}
          </div>

          {/* ATT block */}
          <div className="flex items-center justify-center" style={{ width: "20%" }}>
            {att > 0 && (
              <div className={att > 1 ? "flex flex-col items-center gap-1" : ""}>
                {Array.from({ length: att }).map((_, idx) => {
                  const slotIdx = 1 + def + mid + idx;
                  return (
            <PitchSlot
                      key={slotIdx}
              pos="ST"
                      assigned={lineup[slotIdx] ?? null}
                      isSelecting={selectingSlot === slotIdx}
                      onClick={() => setSelectingSlot(selectingSlot === slotIdx ? null : slotIdx)}
            />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save + Battle buttons */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || filledCount === 0}
            className="rounded-xl bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] font-bold hover:opacity-90 transition px-8 h-11 text-sm shadow-lg shadow-[#d4a843]/20"
          >
            {saving ? "Đang lưu..." : "Lưu đội hình"}
          </Button>
          {filledCount === 5 && (
            <Button
              onClick={handleBattle}
              disabled={battleLoading}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-400 text-white font-bold hover:opacity-90 transition px-8 h-11 text-sm shadow-lg shadow-emerald-500/20"
            >
              {battleLoading ? "Đang tìm trận..." : "⚽ Thi Đấu"}
            </Button>
          )}
        </div>
        {saveMsg && (
          <div className={"text-xs font-bold " + (saveMsg.includes("Đã lưu") ? "text-emerald-400" : "text-red-400")}>
            {saveMsg}
          </div>
        )}
      </div>

      {/* ===== Battle Animation Modal ===== */}
      {battleData && (
        <div className="modal-overlay" style={{ zIndex: 100 }} onClick={(e) => { if (e.target === e.currentTarget && battleFinished) closeBattle(); }}>
          <div className="w-full max-w-3xl mx-4" style={{ maxHeight: "90vh", overflow: "auto" }}>
            {/* Scoreboard */}
            <div className="rounded-t-2xl bg-gradient-to-r from-[#1a2a1a] via-[#0f1f0f] to-[#1a2a1a] border border-white/[.08] border-b-0 px-4 sm:px-8 py-5">
              <div className="flex items-center justify-between gap-4">
                {/* Home */}
                <div className="flex-1 text-center">
                  <div className="text-sm font-extrabold text-emerald-300 truncate">{battleData.home.username}</div>
                  <div className="text-[10px] text-white/30 mt-1">OVR {battleData.home.avgOvr}</div>
                </div>
                {/* Score */}
                <div className="flex items-center gap-3">
                  <div className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                    {(() => {
                      const evts = battleData.events.slice(0, battleEventIdx + 1);
                      return evts.filter((e: any) => e.type === "goal" && e.team === "home").length;
                    })()}
                  </div>
                  <div className="text-lg text-white/20 font-light">:</div>
                  <div className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                    {(() => {
                      const evts = battleData.events.slice(0, battleEventIdx + 1);
                      return evts.filter((e: any) => e.type === "goal" && e.team === "away").length;
                    })()}
                  </div>
                </div>
                {/* Away */}
                <div className="flex-1 text-center">
                  <div className="text-sm font-extrabold text-red-300 truncate">{battleData.away.username}</div>
                  <div className="text-[10px] text-white/30 mt-1">OVR {battleData.away.avgOvr}</div>
                </div>
              </div>
              {/* Minute */}
              <div className="text-center mt-3">
                <span className="text-xs font-bold text-[#c6a96b] bg-[#c6a96b]/10 px-3 py-1 rounded-full">
                  {battleData.events[Math.min(battleEventIdx, battleData.events.length - 1)]?.minute ?? 0}&apos;
                </span>
              </div>
            </div>

            {/* Mini Pitch with ball */}
            <div
              className="relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #1a3a1a 0%, #1e4420 30%, #1a3a1a 100%)",
                height: 200,
                borderLeft: "1px solid rgba(255,255,255,.08)",
                borderRight: "1px solid rgba(255,255,255,.08)",
              }}
            >
              {/* Pitch lines */}
              <svg viewBox="0 0 600 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <rect x="10" y="10" width="580" height="180" rx="2" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
                <line x1="300" y1="10" x2="300" y2="190" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" />
                <circle cx="300" cy="100" r="35" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5" />
                <circle cx="300" cy="100" r="3" fill="rgba(255,255,255,.12)" />
                <rect x="10" y="55" width="50" height="90" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
                <rect x="540" y="55" width="50" height="90" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
                {/* Grass stripes */}
                {[0,1,2,3,4,5].map(i => (
                  <rect key={i} x={10 + i * 96.67} y="10" width="96.67" height="180" fill={i % 2 === 0 ? "rgba(255,255,255,.012)" : "transparent"} />
                ))}
              </svg>

              {/* Home team players (green) - dynamic positions */}
              {homePositions.map((p, i) => {
                const isActive = activePlayer?.team === "home" && activePlayer.index === i;
                return (
                <div key={`h${i}`} className="absolute" style={{
                  left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)",
                  transition: "left 0.7s ease-out, top 0.7s ease-out",
                  zIndex: isActive ? 5 : 2,
                }}>
                  <div style={{
                    width: isActive ? 20 : 16, height: isActive ? 20 : 16, borderRadius: "50%",
                    background: isActive ? "radial-gradient(circle, #86efac, #22c55e)" : "radial-gradient(circle, #4ade80, #16a34a)",
                    boxShadow: isActive ? "0 0 16px rgba(74,222,128,.7), 0 0 30px rgba(74,222,128,.3)" : "0 0 8px rgba(74,222,128,.4)",
                    border: isActive ? "2px solid #fff" : "2px solid rgba(255,255,255,.3)",
                    transition: "all 0.3s ease",
                  }} />
                  <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[7px] font-bold whitespace-nowrap" style={{
                    color: isActive ? "rgba(134,239,172,.9)" : "rgba(134,239,172,.6)",
                    textShadow: isActive ? "0 0 6px rgba(74,222,128,.5)" : "none",
                  }}>
                    {battleData.home.cards[i]?.name?.split(" ").pop() ?? ""}
                  </span>
                </div>
                );
              })}

              {/* Away team players (red) - dynamic positions */}
              {awayPositions.map((p, i) => {
                const isActive = activePlayer?.team === "away" && activePlayer.index === i;
                return (
                <div key={`a${i}`} className="absolute" style={{
                  left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)",
                  transition: "left 0.7s ease-out, top 0.7s ease-out",
                  zIndex: isActive ? 5 : 2,
                }}>
                  <div style={{
                    width: isActive ? 20 : 16, height: isActive ? 20 : 16, borderRadius: "50%",
                    background: isActive ? "radial-gradient(circle, #fca5a5, #ef4444)" : "radial-gradient(circle, #f87171, #dc2626)",
                    boxShadow: isActive ? "0 0 16px rgba(248,113,113,.7), 0 0 30px rgba(248,113,113,.3)" : "0 0 8px rgba(248,113,113,.4)",
                    border: isActive ? "2px solid #fff" : "2px solid rgba(255,255,255,.3)",
                    transition: "all 0.3s ease",
                  }} />
                  <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[7px] font-bold whitespace-nowrap" style={{
                    color: isActive ? "rgba(252,165,165,.9)" : "rgba(252,165,165,.6)",
                    textShadow: isActive ? "0 0 6px rgba(248,113,113,.5)" : "none",
                  }}>
                    {battleData.away.cards[i]?.name?.split(" ").pop() ?? ""}
                  </span>
                </div>
                );
              })}

              {/* Ball */}
              <div
                className="absolute z-10"
                style={{
                  left: `${battleBallPos.x}%`,
                  top: `${battleBallPos.y}%`,
                  transform: "translate(-50%,-50%)",
                  transition: "left 0.6s ease-out, top 0.6s ease-out",
                }}
              >
                <div style={{
                  width: 11, height: 11, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #fff, #ddd)",
                  boxShadow: "0 0 12px rgba(255,255,255,.6), 0 2px 4px rgba(0,0,0,.3)",
                  border: "1px solid rgba(255,255,255,.8)",
                }} />
              </div>

              {/* Goal flash overlay */}
              {goalFlash && (
                <div className="absolute inset-0 z-20 pointer-events-none" style={{
                  background: goalFlash === "home"
                    ? "radial-gradient(ellipse at 90% 50%, rgba(74,222,128,.35), transparent 60%)"
                    : "radial-gradient(ellipse at 10% 50%, rgba(248,113,113,.35), transparent 60%)",
                  animation: "pulse 0.5s ease-out 3",
                }} />
              )}
            </div>

            {/* Event log */}
            <div
              className="rounded-b-2xl bg-[#0f0d0b]/95 border border-white/[.08] border-t-0 px-4 sm:px-6 py-4"
              style={{ maxHeight: 220, overflowY: "auto" }}
            >
              <div className="space-y-1.5">
                {battleData.events.slice(0, battleEventIdx + 1).map((ev: any, i: number) => (
                  <div
                    key={i}
                    className={
                      "flex items-start gap-2 text-xs transition-all " +
                      (i === battleEventIdx ? "opacity-100" : "opacity-50") +
                      (ev.type === "goal" ? " font-bold" : "")
                    }
                  >
                    <span className={
                      "w-8 text-right font-mono font-bold tabular-nums shrink-0 " +
                      (ev.type === "goal" ? "text-[#f2d97a]" : "text-white/30")
                    }>
                      {ev.minute}&apos;
                    </span>
                    <span className={
                      ev.type === "goal" ? "text-[#f2d97a]" :
                      ev.type === "save" ? "text-blue-300" :
                      ev.type === "halftime" || ev.type === "end" || ev.type === "kickoff" ? "text-white/60 italic" :
                      ev.type === "counter" ? "text-orange-300" :
                      "text-white/50"
                    }>
                      {ev.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Result overlay when finished */}
            {battleFinished && (
              <div className="mt-4 rounded-2xl bg-[#0f0d0b]/95 border border-white/[.08] px-6 py-6 text-center space-y-4">
                <div className={
                  "text-3xl font-black " +
                  (battleData.result === "win" ? "text-emerald-400" : battleData.result === "draw" ? "text-amber-400" : "text-red-400")
                }>
                  {battleData.result === "win" ? "CHIẾN THẮNG!" : battleData.result === "draw" ? "HÒA" : "THUA CUỘC"}
                </div>
                <div className="text-lg font-extrabold text-white">
                  {battleData.homeScore} - {battleData.awayScore}
                </div>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#f2d97a]" />
                    <span className="font-bold text-[#f2d97a]">+{battleData.coinReward} xu</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className={"font-bold " + (battleData.rankChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {battleData.rankChange >= 0 ? "+" : ""}{battleData.rankChange} rank
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-white/30">
                  Còn lại: {battleData.remainingMatches} trận hôm nay
                </div>
                <Button
                  onClick={closeBattle}
                  className="rounded-xl bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] font-bold hover:opacity-90 transition px-10 h-11 text-sm shadow-lg shadow-[#d4a843]/20 mt-2"
                >
                  Đóng
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card selector modal */}
      {selectingSlot !== null && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectingSlot(null); }}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-wide">Chọn cầu thủ</span>
                <Badge className="bg-[#c6a96b]/20 text-[#c6a96b] border-[#c6a96b]/30 text-xs">{selectedSlotPos}</Badge>
              </div>
              <div className="flex gap-2">
                {lineup[selectingSlot] && (
                  <Button
                    onClick={() => removeCard(selectingSlot)}
                    className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold hover:bg-red-500/20 h-8 px-3"
                  >
                    Gỡ thẻ
                  </Button>
                )}
                <Button
                  onClick={() => setSelectingSlot(null)}
                  className="rounded-xl bg-white/5 border border-white/[.06] text-amber-200/50 text-xs font-bold hover:bg-white/10 h-8 px-3"
                >
                  Đóng
                </Button>
              </div>
            </div>
            {availableCards.length === 0 ? (
              <div className="text-center py-12 text-amber-100/30 text-sm">
                Không có cầu thủ nào ở vị trí {selectedSlotPos}
              </div>
            ) : (
              <div className="flex gap-4 flex-wrap justify-center">
                {availableCards.map((c) => (
                  <div key={c.id} onClick={() => assignCard(c)} className="cursor-pointer hover:scale-105 transition-transform">
                    <CardPreview item={c} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ================= LOGIN (USER + DISCORD) =================
function LoginPage({ onLogin }: { onLogin: (data: { id: number; username: string; role: "admin" | "user"; balance: number }) => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.trim()) { setError("Nhập tên đăng nhập"); return; }
    if (!pass.trim()) { setError("Nhập mật khẩu"); return; }
    setLoading(true);
    const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username: user.trim(), password: pass }) });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onLogin(res);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-panel w-full max-w-[400px] p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="text-xs text-amber-200/40 hover:text-amber-200/80 flex items-center gap-1 transition"
            >
              ← Về trang chính
            </button>
          </div>
          <div className="flex justify-center mb-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f2d97a] to-[#8b6914] flex items-center justify-center shadow-lg shadow-[#d4a843]/20">
              <Lock className="w-7 h-7 text-[#1a1412]" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-extrabold tracking-wide">Đăng nhập</div>
            <p className="text-xs text-amber-100/40 mt-1.5 tracking-wide">
              Đăng nhập để quản lý đội hình và thẻ.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-amber-200/50 uppercase tracking-widest">Username</label>
              <Input
                value={user}
                onChange={(e) => { setUser(e.target.value); setError(""); }}
                placeholder="Tên của bạn"
                className="bg-black/30 border-white/[.08] text-amber-50 rounded-xl h-11 focus:border-[#c6a96b]/30 transition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-amber-200/50 uppercase tracking-widest">Password</label>
              <Input
                type="password"
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError(""); }}
                placeholder="••••••"
                className="bg-black/30 border-white/[.08] text-amber-50 rounded-xl h-11 focus:border-[#c6a96b]/30 transition"
              />
            </div>
            {error && <div className="text-sm text-red-400 text-center">{error}</div>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl h-11 bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] font-bold hover:opacity-90 transition shadow-lg shadow-[#d4a843]/20"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
            <div className="relative flex items-center gap-2">
              <div className="flex-1 premium-divider" />
              <span className="text-[10px] text-white/20 tracking-wider">hoặc</span>
              <div className="flex-1 premium-divider" />
            </div>
            <a
              href="/api/auth/discord"
              className="w-full text-center px-4 py-2.5 rounded-xl bg-[#5865F2]/90 text-white font-bold hover:bg-[#5865F2] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5865F2]/15"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.445.864-.607 1.25a18.27 18.27 0 00-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.08.08 0 00.087-.027c.461-.63.873-1.295 1.226-1.994a.076.076 0 00-.042-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.294.075.075 0 01.078-.01c3.928 1.793 8.18 1.793 12.062 0a.075.075 0 01.079.009c.12.098.246.198.373.294a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.076.076 0 00-.041.107c.36.699.77 1.364 1.225 1.994a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.057c.5-4.761-.838-8.878-3.557-12.543a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156 0-1.193.957-2.157 2.157-2.157 1.2 0 2.157.964 2.157 2.157 0 1.19-.957 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156 0-1.193.955-2.157 2.157-2.157 1.2 0 2.157.964 2.157 2.157 0 1.19-.957 2.156-2.157 2.156z"/>
              </svg>
              Đăng nhập bằng Discord
            </a>
          </form>
        </div>
      </div>
    </div>
  );
}

// ================= ADD CARD FORM =================
function AddCardForm({ onAdd, onCancel }: { onAdd: (card: CardItem) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [nation, setNation] = useState("VN");
  const [position, setPosition] = useState<Position>("ST");
  const [rating, setRating] = useState(75);
  const [atk, setAtk] = useState(70);
  const [def, setDef] = useState(70);
  const [pas, setPas] = useState(70);
  const [imp, setImp] = useState(70);
  const [stock, setStock] = useState(1);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  const distributeStats = (ovr: number) => {
    const base = Math.max(1, ovr - 5);
    const range = Math.min(10, Math.max(1, Math.round(ovr * 0.08)));
    const rand = () => Math.min(99, Math.max(1, base + Math.floor(Math.random() * range * 2) - range));
    setAtk(rand()); setDef(rand()); setPas(rand()); setImp(rand());
  };

  const handleStatChange = (label: string, raw: string, setter: (v: number) => void) => {
    setRawInputs(prev => ({ ...prev, [label]: raw }));
    if (raw === "" || raw === "-") return;
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      const clamped = Math.min(99, Math.max(0, n));
      setter(clamped);
      if (label === "OVR" && clamped > 0) distributeStats(clamped);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const res = await api("/api/cards", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim().toUpperCase(),
        nation, position, rating, atk, def, pas, imp,
        series: "Futsal", region: "ASIA",
        stock,
      }),
    });
    if (res.error) return;
    onAdd(res);
  };

  return (
    <Card className="bg-[#2a1f1b] border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Thêm thẻ mới</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-amber-200/70">Tên</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="bg-[#1f1714]/70 border-white/15 text-amber-50" maxLength={12} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-amber-200/70">Quốc gia</label>
            <Input value={nation} onChange={(e) => setNation(e.target.value)} placeholder="VN" className="bg-[#1f1714]/70 border-white/15 text-amber-50" maxLength={3} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-amber-200/70">Vị trí</label>
          <select value={position} onChange={(e) => setPosition(e.target.value as Position)} className="w-full bg-[#1f1714]/70 border border-white/15 text-amber-50 rounded-lg px-3 py-2 text-sm">
            {(["GK","CB","CM","ST"] as Position[]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "OVR", val: rating, set: setRating },
            { label: "ATK", val: atk, set: setAtk },
            { label: "DEF", val: def, set: setDef },
            { label: "PAS", val: pas, set: setPas },
            { label: "IMP", val: imp, set: setImp },
          ].map((s) => (
            <div key={s.label} className="space-y-1">
              <label className="text-[10px] font-bold text-amber-200/70 text-center block">{s.label}</label>
              <Input
                type="text"
                inputMode="numeric"
                value={rawInputs[s.label] !== undefined ? rawInputs[s.label] : String(s.val)}
                onChange={(e) => handleStatChange(s.label, e.target.value, s.set)}
                onFocus={() => setRawInputs(prev => ({ ...prev, [s.label]: String(s.val) }))}
                onBlur={() => setRawInputs(prev => { const next = { ...prev }; delete next[s.label]; return next; })}
                className="bg-[#1f1714]/70 border-white/15 text-amber-50 text-center text-sm"
              />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-amber-200/70">Số lượng (Stock)</label>
          <Input
            type="text"
            inputMode="numeric"
            value={String(stock)}
            onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n) && n >= 1) setStock(Math.floor(n)); }}
            className="bg-[#1f1714]/70 border-white/15 text-amber-50 text-sm w-24"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1 rounded-lg bg-[#c6a96b] text-[#1a1412] font-bold hover:bg-[#d4b86b]">Thêm</Button>
          <Button onClick={onCancel} className="rounded-lg bg-[#2a1f1b] border border-white/10 text-amber-200/70 font-bold hover:bg-[#3b2b23]">Huỷ</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ================= EFFECTS LIST =================
type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
const EFFECT_RARITY: Record<string, Rarity> = {
  "": "COMMON",
  "GlowPulse": "RARE",
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

const EFFECTS: { value: string; label: string; desc: string; rarity: Rarity }[] = [
  { value: "", label: "None", desc: "Không hiệu ứng", rarity: "COMMON" },
  { value: "GlowPulse", label: "Glow Pulse", desc: "Ánh vàng nhấp nháy", rarity: "RARE" },
  { value: "GoldSparkle", label: "Gold Sparkle", desc: "Kim cương lấp lánh", rarity: "EPIC" },
  { value: "IceStorm", label: "Ice Sparkle", desc: "Băng lấp lánh, hiệu ứng lạnh", rarity: "EPIC" },
  { value: "ShadowAura", label: "Shadow Aura", desc: "Hào quang bóng tối", rarity: "LEGENDARY" },
  { value: "HolyLight", label: "Holy Sparkle", desc: "Ánh sáng thiêng liêng lấp lánh", rarity: "LEGENDARY" },
  { value: "InfernoBurst", label: "Inferno Sparkle", desc: "Lửa đỏ bùng nổ lấp lánh", rarity: "LEGENDARY" },
  { value: "Hologram", label: "Holo Sparkle", desc: "Hiệu ứng hologram xanh lấp lánh", rarity: "LEGENDARY" },
];

// ================= MY CARD (EDIT SINGLE CARD) =================
function MyCardPage({ allCards, setAllCards, isAdmin, username, userId, onRefresh, cardsLoading }: {
  allCards: CardItem[];
  setAllCards: React.Dispatch<React.SetStateAction<CardItem[]>>;
  isAdmin: boolean;
  username: string;
  userId: number;
  onRefresh: () => void;
  cardsLoading: boolean;
}) {
  const allMyCards = isAdmin ? allCards : allCards.filter(c => c.ownerId === userId);
  const [cardSearch, setCardSearch] = useState("");
  const [cardPosFilter, setCardPosFilter] = useState("ALL");
  const myCards = allMyCards.filter(c => {
    if (cardPosFilter !== "ALL" && c.position !== cardPosFilter) return false;
    if (cardSearch) {
      const q = cardSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.owner?.toString().toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    }
    return true;
  });
  const [selectedId, setSelectedId] = useState(allMyCards[0]?.id);
  const selected = allMyCards.find((c) => c.id === selectedId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [listPrice, setListPrice] = useState<number | null>(100);
  const [listStock, setListStock] = useState(1);

  const [editName, setEditName] = useState(selected?.name ?? "");
  const [editPosition, setEditPosition] = useState<Position>(selected?.position ?? "ST");
  const [editEffect, setEditEffect] = useState(selected?.effect ?? "");
  const [editRating, setEditRating] = useState(selected?.rating ?? 0);
  const [editAtk, setEditAtk] = useState(selected?.atk ?? 0);
  const [editDef, setEditDef] = useState(selected?.def ?? 0);
  const [editPas, setEditPas] = useState(selected?.pas ?? 0);
  const [editImp, setEditImp] = useState(selected?.imp ?? 0);
  const [editAvatarStyle, setEditAvatarStyle] = useState<AvatarStyle>(
    selected?.avatarStyle ?? { ...DEFAULT_AVATAR_STYLE }
  );
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});

  // Phân trang danh sách thẻ trong mục Edit Card để admin dễ quản lý khi có nhiều thẻ
  const CARD_PAGE_SIZE = 40;
  const [cardPage, setCardPage] = useState(1);
  const totalCardPages = Math.max(1, Math.ceil(myCards.length / CARD_PAGE_SIZE));
  const clampedCardPage = Math.min(cardPage, totalCardPages);
  const pagedCards = myCards.slice((clampedCardPage - 1) * CARD_PAGE_SIZE, clampedCardPage * CARD_PAGE_SIZE);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  const distributeStats = (ovr: number) => {
    const base = Math.max(1, ovr - 5);
    const range = Math.min(10, Math.max(1, Math.round(ovr * 0.08)));
    const rand = () => Math.min(99, Math.max(1, base + Math.floor(Math.random() * range * 2) - range));
    setEditAtk(rand()); setEditDef(rand()); setEditPas(rand()); setEditImp(rand());
  };

  const handleStatChange = (label: string, raw: string, setter: (v: number) => void) => {
    setRawInputs(prev => ({ ...prev, [label]: raw }));
    if (raw === "" || raw === "-") return;
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      const clamped = Math.min(99, Math.max(0, n));
      setter(clamped);
      if (label === "OVR" && clamped > 0) distributeStats(clamped);
    }
  };

  useEffect(() => {
    if (selected) {
      setEditName(selected.name);
      setEditPosition(selected.position);
      setEditEffect(selected.effect ?? "");
      setEditRating(selected.rating);
      setEditAtk(selected.atk);
      setEditDef(selected.def);
      setEditPas(selected.pas);
      setEditImp(selected.imp);
      setEditAvatarStyle(selected.avatarStyle ?? { ...DEFAULT_AVATAR_STYLE });
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cardsLoading) {
    return <div className="text-amber-100/60 text-sm">Đang tải thẻ...</div>;
  }

  if (!selected && !showAddForm) return <div className="text-amber-100/50">Chưa có thẻ nào</div>;

  const previewItem: CardItem | null = selected ? {
    ...selected,
    name: editName || selected.name,
    position: editPosition,
    effect: editEffect || undefined,
    rating: editRating,
    atk: editAtk,
    def: editDef,
    pas: editPas,
    imp: editImp,
  } : null;

  const handleApply = async () => {
    if (!selected) return;
    const body: Record<string, unknown> = {
      name: editName || selected.name,
      position: editPosition,
      avatarText: editAvatarStyle.text ?? null,
      avatarTextColor: editAvatarStyle.textColor,
      avatarColorMode: editAvatarStyle.colorMode,
      avatarColor1: editAvatarStyle.colors[0],
      avatarColor2: editAvatarStyle.colors[1],
      avatarColor3: editAvatarStyle.colors[2],
    };
    if (isAdmin) {
      body.effect = editEffect || null;
      body.rating = editRating;
      body.atk = editAtk;
      body.def = editDef;
      body.pas = editPas;
      body.imp = editImp;
    }
    await api(`/api/cards/${selectedId}`, { method: "PUT", body: JSON.stringify(body) });
    onRefresh();
  };

  const handleAddCard = (rawCard: unknown) => {
    const card = dbCardToFrontend(rawCard, userId);
    setAllCards(prev => [...prev, card]);
    setSelectedId(card.id);
    setShowAddForm(false);
  };

  const handleDeleteCard = async (id: string) => {
    await api(`/api/cards/${id}`, { method: "DELETE" });
    setAllCards(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) {
      const remaining = allMyCards.filter(c => c.id !== id);
      setSelectedId(remaining[0]?.id ?? "");
    }
  };

  const toggleBulkDelete = (id: string) => {
    setBulkDeleteIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!isAdmin || bulkDeleteIds.length === 0) return;
    if (!confirm(`Xoá ${bulkDeleteIds.length} thẻ đã chọn?`)) return;
    await Promise.all(
      bulkDeleteIds.map((id) => api(`/api/cards/${id}`, { method: "DELETE" }))
    );
    setAllCards(prev => prev.filter(c => !bulkDeleteIds.includes(c.id)));
    if (bulkDeleteIds.includes(selectedId)) {
      const remaining = allMyCards.filter(c => !bulkDeleteIds.includes(c.id));
      setSelectedId(remaining[0]?.id ?? "");
    }
    setBulkDeleteIds([]);
    onRefresh();
  };

  const handleList = async () => {
    if (!selected || listPrice === null || listPrice <= 0) return;
    const res = await fetch("/api/market/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: selected.id, price: listPrice, stock: listStock }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Lỗi khi rao bán");
      return;
    }
    onRefresh();
  };

  const handleUnlist = async () => {
    if (!selected) return;
    await api("/api/market/unlist", { method: "POST", body: JSON.stringify({ cardId: selected.id }) });
    onRefresh();
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div>
        <div className="text-xl font-extrabold flex items-center gap-2">
          {isAdmin ? "EDIT CARD" : "MY CARDS"}
        </div>
        <div className="text-xs text-amber-100/50 mt-0.5">
          {isAdmin ? "Admin — chỉnh sửa, thêm thẻ & hiệu ứng" : "Tuỳ chỉnh tên, avatar & rao bán thẻ"}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {isAdmin && (
          <>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên, owner..."
              value={cardSearch}
              onChange={e => setCardSearch(e.target.value)}
              className="bg-[#1f1714]/70 border border-white/15 text-amber-50 rounded-xl px-3 py-2 text-sm placeholder:text-amber-100/30 focus:border-[#c6a96b]/40 transition w-[200px]"
            />
            <div className="flex gap-1 flex-wrap">
              {["ALL", "GK", "CB", "CM", "ST"].map(pos => (
                <button key={pos} onClick={() => setCardPosFilter(pos)}
                  className={"px-2 py-1 rounded-lg text-[10px] font-bold border transition " +
                    (cardPosFilter === pos
                      ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]"
                      : "bg-[#2a1f1b] text-amber-200/70 border-white/10 hover:bg-[#3b2b23]")}
                >{pos}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 min-w-0 bg-[#1f1714]/70 border border-white/15 text-amber-50 rounded-xl px-4 py-2.5 text-sm font-bold appearance-none cursor-pointer focus:border-[#c6a96b]/40 transition max-w-[320px]"
        >
          {pagedCards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.position} {c.rating}
              {isAdmin && c.owner && ` — ${c.owner}`}
              {c.listed ? " 💰" : ""}
            </option>
          ))}
        </select>
        {isAdmin && selected && (
          <button
            onClick={() => handleDeleteCard(selected.id)}
            className="px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-bold hover:bg-red-500/25 transition flex items-center gap-1"
          >
            ✕ Xoá
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-dashed border-[#c6a96b]/40 text-[#c6a96b]/70 hover:text-[#c6a96b] hover:border-[#c6a96b]/70 transition"
          >
            + Thêm
          </button>
        )}
        <div className="flex items-center gap-2 text-[10px] text-white/25 font-bold tracking-wider">
          <span>{isAdmin && (cardSearch || cardPosFilter !== "ALL") ? `${myCards.length} / ${allMyCards.length}` : myCards.length} thẻ</span>
          {totalCardPages > 1 && (
            <>
              <button
                onClick={() => setCardPage(p => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-white/15 text-[9px] hover:bg-white/5"
              >
                ←
              </button>
              <span>Trang {clampedCardPage}/{totalCardPages}</span>
              <button
                onClick={() => setCardPage(p => Math.min(totalCardPages, p + 1))}
                className="px-2 py-1 rounded border border-white/15 text-[9px] hover:bg-white/5"
              >
                →
              </button>
            </>
          )}
        </div>
      </div>

      {isAdmin && myCards.length > 0 && (
        <div className="mt-2 rounded-xl border border-white/10 bg-[#1b1411]/70 px-3 py-2 space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-amber-100/70">
              Chọn nhiều thẻ để xoá nhanh
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteIds.length === 0}
              className={
                "px-3 py-1.5 rounded-lg text-[10px] font-bold border " +
                (bulkDeleteIds.length === 0
                  ? "border-red-500/10 text-red-300/40 cursor-not-allowed"
                  : "border-red-500/40 text-red-300 hover:bg-red-500/15")
              }
            >
              Xoá {bulkDeleteIds.length || ""} thẻ đã chọn
            </button>
          </div>
          <div className="space-y-1">
            {pagedCards.map(c => (
              <label
                key={`bulk-${c.id}`}
                className="flex items-center gap-2 text-[11px] text-amber-100/70 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="rounded border-white/30 bg-transparent"
                  checked={bulkDeleteIds.includes(c.id)}
                  onChange={() => toggleBulkDelete(c.id)}
                />
                <span className="truncate">
                  {c.name} — {c.position} {c.rating}
                  {c.owner && ` — ${c.owner}`}
                  {c.listed && " 💰"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {showAddForm && <AddCardForm onAdd={handleAddCard} onCancel={() => setShowAddForm(false)} />}

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
        {previewItem && (
          <div className="flex flex-col items-center sm:items-start flex-shrink-0">
            <div className="mycard-preview-wrap">
              <CardPreview
                item={previewItem}
                avatarText={editAvatarStyle.text || undefined}
                avatarStyleOverride={editAvatarStyle}
              />
            </div>
            {selected?.listed && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 mt-2">
                <Tag className="w-3.5 h-3.5 text-green-400" />
                <span className="text-sm font-bold text-green-400">{selected.listed.price} COIN</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 w-full sm:flex-1 sm:min-w-[280px]">
        {selected && (
          <Card className="bg-[#2a1f1b] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tuỳ chỉnh thẻ {selected?.isBought && !isAdmin && <span className="text-xs text-red-400/80 font-normal ml-2">🔒 Thẻ mua từ market — không chỉnh sửa được</span>}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Tên</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                    className="bg-[#1f1714]/70 border-white/15 text-amber-50 h-9 text-sm"
                    maxLength={12}
                    disabled={!!selected?.isBought && !isAdmin}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Chữ avatar</label>
                  <Input
                    value={editAvatarStyle.text ?? ""}
                    onChange={(e) => setEditAvatarStyle({ ...editAvatarStyle, text: e.target.value.slice(0, 2) })}
                    placeholder="AB"
                    className="bg-[#1f1714]/70 border-white/15 text-amber-50 h-9 text-sm uppercase"
                    maxLength={2}
                    disabled={!!selected?.isBought && !isAdmin}
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Vị trí</label>
                  <select
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value as Position)}
                    className="w-full bg-[#1f1714]/70 border border-white/15 text-amber-50 rounded-lg px-3 py-2 h-9 text-sm"
                  >
                    {(["GK", "CB", "CM", "ST"] as Position[]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Màu</label>
                <div className={`flex justify-center gap-6 items-end ${selected?.isBought && !isAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex flex-col items-center gap-1.5">
                    <label
                      className="w-12 h-12 rounded-xl border-2 border-white/20 cursor-pointer transition hover:scale-110 shadow-lg block overflow-hidden"
                      style={{ background: editAvatarStyle.colors[0] }}
                    >
                      <input
                        type="color"
                        value={editAvatarStyle.colors[0]}
                        onChange={(e) => {
                          const c = e.target.value;
                          setEditAvatarStyle({ ...editAvatarStyle, colorMode: 1, colors: [c, c, c] });
                        }}
                        className="opacity-0 w-0 h-0 absolute"
                        disabled={!!selected?.isBought && !isAdmin}
                      />
                    </label>
                    <span className="text-[9px] text-amber-200/50 font-bold">Avatar</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <label
                      className="w-12 h-12 rounded-xl border-2 border-white/20 cursor-pointer transition hover:scale-110 shadow-lg flex items-center justify-center text-xs font-bold overflow-hidden"
                      style={{ background: editAvatarStyle.textColor, color: editAvatarStyle.textColor.toLowerCase() === '#ffffff' ? '#000' : '#fff' }}
                    >
                      Aa
                      <input
                        type="color"
                        value={editAvatarStyle.textColor}
                        onChange={(e) => setEditAvatarStyle({ ...editAvatarStyle, textColor: e.target.value })}
                        className="opacity-0 w-0 h-0 absolute"
                        disabled={!!selected?.isBought && !isAdmin}
                      />
                    </label>
                    <span className="text-[9px] text-amber-200/50 font-bold">Chữ</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <>
                  <Separator className="bg-white/10" />
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { label: "OVR", val: editRating, set: setEditRating },
                      { label: "ATK", val: editAtk, set: setEditAtk },
                      { label: "DEF", val: editDef, set: setEditDef },
                      { label: "PAS", val: editPas, set: setEditPas },
                      { label: "IMP", val: editImp, set: setEditImp },
                    ].map((s) => (
                      <div key={s.label} className="space-y-1">
                        <label className="text-[10px] font-bold text-amber-200/70 text-center block">
                          {s.label}
                        </label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={rawInputs[s.label] !== undefined ? rawInputs[s.label] : String(s.val)}
                          onChange={(e) => handleStatChange(s.label, e.target.value, s.set)}
                          onFocus={() => setRawInputs(prev => ({ ...prev, [s.label]: String(s.val) }))}
                          onBlur={() => setRawInputs(prev => { const next = { ...prev }; delete next[s.label]; return next; })}
                          className="bg-[#1f1714]/70 border-white/15 text-amber-50 text-center text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Effect (Admin)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {EFFECTS.map((fx) => {
                        const isChosen = editEffect === fx.value;
                        return (
                          <button
                            key={fx.value}
                            onClick={() => setEditEffect(fx.value)}
                            className={
                              "rounded-lg border px-3 py-2 text-left transition-all " +
                              (isChosen
                                ? "border-[#c6a96b]/60 bg-[#c6a96b]/15"
                                : "border-white/10 bg-[#1f1714]/40 hover:bg-[#1f1714]/70")
                            }
                          >
                            <div className={"text-xs font-bold " + (isChosen ? "text-amber-100" : "text-amber-200/60")}>
                              {fx.label}
                            </div>
                            {fx.rarity !== "COMMON" && (
                              <div className="text-[8px] font-black mt-0.5" style={{ color: RARITY_STYLE[fx.rarity].color, letterSpacing: '.1em' }}>
                                {fx.rarity}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <Button
                className="w-full rounded-lg bg-[#c6a96b] text-[#1a1412] font-bold hover:bg-[#d4b86b] h-9 text-sm"
                onClick={handleApply}
              >
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        )}

        {selected && (
          <Card className="bg-[#2a1f1b] border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#c6a96b]" />
                Market Listing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selected.listed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Coins className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-sm font-bold text-green-400">Listed on Market</div>
                      <div className="text-xs text-green-400/70">Selling for {selected.listed.price} COIN · Còn {selected.stock} thẻ</div>
                    </div>
                  </div>
                  <Button
                    onClick={handleUnlist}
                    className="w-full rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-bold hover:bg-red-500/30"
                  >
                    Unlist from Market
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-amber-100/50">
                    Đặt giá và đăng bán thẻ này trên market cho người chơi khác mua.
                  </div>
                  <div className={isAdmin ? "grid grid-cols-2 gap-3" : ""}>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-amber-200/70 uppercase tracking-wider">Giá (COIN)</label>
                      <Input
                        type="number"
                        value={listPrice ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            setListPrice(null);
                          } else {
                            const n = Number(v);
                            setListPrice(Number.isNaN(n) ? null : Math.min(3000, n));
                          }
                        }}
                        min={1}
                        max={3000}
                        placeholder="Giá (max 3000)"
                        className="bg-[#1f1714]/70 border-white/15 text-amber-50"
                      />
                    </div>
                    {isAdmin && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-200/70 uppercase tracking-wider">Số lượng</label>
                        <Input
                          type="number"
                          value={listStock}
                          onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n) && n >= 1) setListStock(Math.floor(n)); }}
                          min={1}
                          placeholder="1"
                          className="bg-[#1f1714]/70 border-white/15 text-amber-50"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleList}
                    disabled={listPrice === null || listPrice <= 0}
                    className="w-full rounded-lg bg-[#c6a96b] text-[#1a1412] font-bold hover:bg-[#d4b86b]"
                  >
                    List {isAdmin && listStock > 1 ? `${listStock}x` : ''} for {listPrice} COIN
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}

// ================= BATTLE PASS PAGE =================
type BattlePassMilestone = {
  level: number;
  type: string;
  label: string;
  unlocked: boolean;
  claimed: boolean;
};

function BattlePassPage({ userId, onRefresh }: { userId: number; onRefresh: () => void }) {
  const [level, setLevel] = useState(0);
  const [matches, setMatches] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);
  const [milestones, setMilestones] = useState<BattlePassMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [rewardCard, setRewardCard] = useState<CardItem | null>(null);

  useEffect(() => {
    loadBattlePass();
  }, []);

  const loadBattlePass = async () => {
    setLoading(true);
    try {
      const res = await api<{ level: number; matches: number; daysLeft: number; milestones: BattlePassMilestone[]; error?: string }>("/api/battlepass");
      if (res.error) {
        setError(res.error);
      } else {
        setLevel(res.level);
        setMatches(res.matches);
        setDaysLeft(res.daysLeft);
        setMilestones(res.milestones);
      }
    } catch (e) {
      console.error("Failed to load battle pass:", e);
      setError("Lỗi khi tải Battle Pass");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (milestoneLevel: number) => {
    setClaiming(milestoneLevel);
    setError("");
    setInfo("");
    setRewardCard(null);
    try {
      const res = await api<{ ok?: boolean; error?: string; reward?: any }>("/api/battlepass", {
        method: "POST",
        body: JSON.stringify({ level: milestoneLevel }),
      });
      if (res.error) {
        setError(res.error);
      } else {
        if (res.reward) {
          if (res.reward.type === "coin") {
            setInfo(`Đã nhận +${res.reward.amount} COIN.`);
            setRewardCard(null);
          } else if (res.reward.type === "pack_silver" && res.reward.cardName && res.reward.deltaStats) {
            const stat = Object.keys(res.reward.deltaStats)[0];
            const val = res.reward.deltaStats[stat];
            setInfo(`Silver Pack: Thẻ "${res.reward.cardName}" được +${val} ${stat.toUpperCase()}.`);
            if (res.reward.card) {
              setRewardCard(dbCardToFrontend(res.reward.card, userId));
            }
          } else if (res.reward.type === "pack_gold" && res.reward.cardName && res.reward.deltaStats) {
            const parts = Object.entries(res.reward.deltaStats).map(
              ([k, v]) => `+${v as number} ${k.toUpperCase()}`
            );
            setInfo(`Gold Pack: Thẻ "${res.reward.cardName}" được ${parts.join(", ")}.`);
            if (res.reward.card) {
              setRewardCard(dbCardToFrontend(res.reward.card, userId));
            }
          } else if (res.reward.type === "pack_ruby" && res.reward.cardName && res.reward.deltaStats) {
            const parts = Object.entries(res.reward.deltaStats).map(
              ([k, v]) => `+${v as number} ${k.toUpperCase()}`
            );
            setInfo(`Ruby Pack: Thẻ "${res.reward.cardName}" được ${parts.join(", ")}.`);
            if (res.reward.card) {
              setRewardCard(dbCardToFrontend(res.reward.card, userId));
            }
          } else if (res.reward.type === "card_70" && res.reward.cardName) {
            setInfo(`Đã nhận thẻ mới "${res.reward.cardName}" (OVR ${res.reward.rating}).`);
            if (res.reward.card) {
              setRewardCard(dbCardToFrontend(res.reward.card, userId));
            }
          } else if (res.reward.type === "card_80" && res.reward.cardName) {
            setInfo(`Đã nhận thẻ mới "${res.reward.cardName}" (OVR ${res.reward.rating}).`);
            if (res.reward.card) {
              setRewardCard(dbCardToFrontend(res.reward.card, userId));
            }
          } else if (res.reward.type === "card_season" && res.reward.cardName) {
            setInfo(`Đã nhận thẻ season đặc biệt "${res.reward.cardName}" (OVR ${res.reward.rating}).`);
            if (res.reward.card) {
              setRewardCard(dbCardToFrontend(res.reward.card, userId));
            }
          }
        }
        await loadBattlePass();
        onRefresh();
      }
    } catch (e) {
      setError("Lỗi khi nhận thưởng");
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-amber-100/60 text-sm">Đang tải Battle Pass...</div>
    );
  }

  // Tính level tiếp theo và số trận cần (theo các mốc 1-3-5-7-10-15-20-25-30)
  const BP_THRESHOLDS = [
    { level: 1, matches: 1 },
    { level: 3, matches: 10 },
    { level: 5, matches: 50 },
    { level: 7, matches: 80 },
    { level: 10, matches: 100 },
    { level: 15, matches: 130 },
    { level: 20, matches: 150 },
    { level: 25, matches: 180 },
    { level: 30, matches: 200 },
  ];

  function getMatchesForLevel(lvl: number): number {
    const cfg = BP_THRESHOLDS.find(t => t.level === lvl);
    return cfg?.matches ?? 0;
  }

  const getNextLevelInfo = () => {
    // Tìm mốc hiện tại và mốc tiếp theo dựa trên số trận
    let currentIdx = -1;
    for (let i = 0; i < BP_THRESHOLDS.length; i++) {
      if (matches >= BP_THRESHOLDS[i].matches) currentIdx = i;
    }
    const nextIdx = Math.min(BP_THRESHOLDS.length - 1, currentIdx + 1);
    const currentLevel = currentIdx >= 0 ? BP_THRESHOLDS[currentIdx].level : 0;
    const nextLevel = BP_THRESHOLDS[nextIdx].level;
    const currentFloorMatches = currentIdx >= 0 ? BP_THRESHOLDS[currentIdx].matches : 0;
    const needed = Math.max(0, BP_THRESHOLDS[nextIdx].matches - matches);
    return {
      current: currentLevel,
      next: nextLevel,
      matchesNeeded: needed,
      currentMatches: matches,
      floorMatches: currentFloorMatches,
      nextMatches: BP_THRESHOLDS[nextIdx].matches,
    };
  };

  const nextLevelInfo = getNextLevelInfo();
  const currentMatchesForLevel = nextLevelInfo.floorMatches;
  const nextMatchesForLevel = nextLevelInfo.nextMatches;
  const levelProgress = nextLevelInfo.matchesNeeded > 0 
    ? ((nextLevelInfo.currentMatches - currentMatchesForLevel) / (nextMatchesForLevel - currentMatchesForLevel)) * 100
    : 100;

  return (
    <div className="space-y-6">
      <div className="text-xl font-extrabold">BATTLE PASS - 30 Ngày</div>
      <div className="text-xs text-amber-200/60">
        Đá càng nhiều trận Haxball sẽ nhận được phần thưởng dựa trên level.
      </div>
      
      {error && (
        <div className="glass-panel p-4 rounded-xl bg-red-500/20 border border-red-500/30">
          <div className="text-red-400">{error}</div>
        </div>
      )}
      {info && !error && (
        <div className="glass-panel p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/40">
          <div className="text-xs text-emerald-200">{info}</div>
        </div>
      )}
      {rewardCard && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs font-bold text-amber-100/80 uppercase tracking-wide">
            Thẻ/Pack bạn vừa mở
          </div>
          <div className="scale-95 sm:scale-100">
            <CardPreview item={rewardCard} />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="glass-panel p-6 rounded-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-amber-200/70">Tiến độ</div>
            <div className="text-2xl font-extrabold text-amber-100">
              Level {nextLevelInfo.current} → {nextLevelInfo.next}
            </div>
          </div>
          <div className="relative h-6 bg-white/5 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#c6a96b] to-[#f2d97a] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, levelProgress))}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-100">
              {nextLevelInfo.matchesNeeded > 0 
                ? `${nextLevelInfo.currentMatches} / ${getMatchesForLevel(nextLevelInfo.next)} trận`
                : "Hoàn thành!"
              }
            </div>
          </div>
          <div className="text-xs text-amber-200/60">
            Còn lại {daysLeft} ngày trong mùa này
          </div>
        </div>
      </div>

      {/* Timeline Milestones */}
      <div className="space-y-4">
        <div className="text-lg font-bold text-amber-100">Phần thưởng</div>
        
        {/* Timeline ngang */}
        <div className="glass-panel p-6 rounded-xl overflow-x-auto">
          <div className="relative min-w-[800px]">
            {/* Timeline line */}
            <div className="absolute top-12 left-0 right-0 h-1 bg-white/10" />
            <div
              className="absolute top-12 left-0 h-1 bg-gradient-to-r from-[#c6a96b] to-[#f2d97a] transition-all duration-500"
              style={{ width: `${Math.min(100, (matches / 200) * 100)}%` }}
            />
            
            {/* Milestones */}
            <div className="relative flex justify-between items-start">
              {milestones.map((m, idx) => {
                const isCurrent = level === m.level;
                const isPast = level > m.level;
                const isFuture = level < m.level;
                
                return (
                  <div
                    key={m.level}
                    className="flex flex-col items-center"
                    style={{ width: `${100 / milestones.length}%` }}
                  >
                    {/* Marker */}
                    <div className="relative z-10 mb-4">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? "bg-[#f2d97a] border-[#c6a96b] scale-125 shadow-lg shadow-[#f2d97a]/50 text-[#1a1412]"
                            : m.claimed
                            ? "bg-green-500 border-green-400 text-white"
                            : m.unlocked
                            ? "bg-amber-400 border-amber-300 text-[#1a1412]"
                            : "bg-white/20 border-white/30 text-amber-200/40"
                        }`}
                      >
                        {m.claimed ? "✓" : m.level}
                      </div>
                      {isCurrent && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-[#f2d97a] whitespace-nowrap">
                          Level hiện tại
                        </div>
                      )}
                    </div>
                    
                    {/* Reward Card */}
                    <div
                      className={`w-full max-w-[140px] glass-panel p-3 rounded-xl border-2 transition-all ${
                        isCurrent
                          ? "border-[#f2d97a] bg-[#f2d97a]/10 scale-105"
                          : m.claimed
                          ? "border-green-500/30 bg-green-500/5"
                          : m.unlocked
                          ? "border-amber-400/40 bg-amber-400/5"
                          : "border-white/10 bg-white/2 opacity-60"
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-200/70 mb-1 text-center">Level {m.level}</div>
                      <div className="text-xs font-bold text-amber-100 mb-1 text-center leading-tight">{m.label}</div>
                      <div className="text-[10px] text-amber-200/50 text-center mb-2">
                        {(() => {
                          const req = getMatchesForLevel(m.level);
                          return req ? `${req} trận` : "";
                        })()}
                      </div>
                      {m.unlocked && !m.claimed && (
                        <Button
                          onClick={() => handleClaim(m.level)}
                          disabled={claiming === m.level}
                          className="w-full bg-[#c6a96b]/20 hover:bg-[#c6a96b]/30 text-[#f2d97a] font-bold text-[10px] py-1 h-auto"
                        >
                          {claiming === m.level ? "..." : "Nhận"}
                        </Button>
                      )}
                      {m.claimed && (
                        <div className="text-[10px] font-bold text-green-400 text-center">Đã nhận</div>
                      )}
                      {!m.unlocked && (
                        <div className="text-[10px] font-bold text-amber-200/40 text-center">Chưa mở</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= COLLECTION (MY CARDS) =================
function CollectionPage({ myCards, cardsLoading }: { myCards: CardItem[]; cardsLoading: boolean }) {
  if (cardsLoading) {
    return (
      <div className="text-center py-10 text-amber-100/60 text-sm">Đang tải thẻ...</div>
    );
  }

  if (myCards.length === 0) {
    return (
      <div className="text-center py-10 text-amber-100/60 text-sm">Bạn chưa có thẻ nào</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xl font-extrabold">COLLECTION - Thẻ của bạn</div>
      <div className="text-sm text-amber-200/70 mb-4">
        Tổng số thẻ: {myCards.length}
      </div>
        <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
          {myCards.map((c) => (
          <div 
            key={c.id} 
            className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
              <CardPreview item={c} />
            </div>
          ))}
        </div>
    </div>
  );
}


// ================= UPGRADE - PACK OPENING =================
function UpgradePage({ balance, loggedIn, userId, onLogin, onRefresh, allCards }: {
  balance: number;
  loggedIn: boolean;
  userId: number;
  onLogin: () => void;
  onRefresh: () => void;
  allCards: CardItem[];
}) {
  const [opening, setOpening] = useState(false);
  const [packResult, setPackResult] = useState<{ stats: Record<string, number>; card: CardItem } | null>(null);
  const [myBalance, setMyBalance] = useState(balance);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [step, setStep] = useState<"selectPack" | "selectCard" | "result">("selectPack");

  const myCards = allCards.filter(c => c.ownerId === userId);

  useEffect(() => { setMyBalance(balance); }, [balance]);

  // ================= PACK NÂNG CHỈ SỐ =================
  const PACKS = [
    { id: "silver", label: "Pack Bạc", cost: 50, color: "from-slate-400 to-slate-600", badge: "bg-slate-400/20 text-slate-300", desc: "+1 chỉ số ngẫu nhiên", hexColor: "#9ca3af" },
    { id: "gold", label: "Pack Vàng", cost: 100, color: "from-amber-400 to-amber-600", badge: "bg-amber-400/20 text-amber-300", desc: "+1~2 chỉ số ngẫu nhiên", hexColor: "#d97706" },
    { id: "red", label: "Pack Đỏ", cost: 200, color: "from-red-400 to-red-600", badge: "bg-red-400/20 text-red-300", desc: "+2~3 chỉ số ngẫu nhiên", hexColor: "#dc2626" },
  ];

  const STAT_LABELS: Record<string, string> = { atk: "ATK", def: "DEF", pas: "PAS", imp: "IMP", rating: "OVR" };

  const handlePackSelect = (packId: string) => {
    if (!loggedIn) { onLogin(); return; }
    const pack = PACKS.find(p => p.id === packId);
    if (pack && myBalance >= pack.cost) {
      setSelectedPack(packId);
      setStep("selectCard");
      setSelectedCardId(null);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const [packPhase, setPackPhase] = useState<"idle" | "flipping" | "revealing">("idle");

  const handleOpenPack = async () => {
    if (!selectedPack || !selectedCardId) return;
    setOpening(true);
    setPackPhase("flipping");
    setStep("result");
    const res = await api("/api/market/pack", { method: "POST", body: JSON.stringify({ packId: selectedPack, cardId: selectedCardId }) });
    if (res.error) { setOpening(false); setPackPhase("idle"); setStep("selectCard"); return; }
    // Wait for flip animation
    await new Promise(r => setTimeout(r, 2200));
    setMyBalance(res.balance);
    onRefresh();
    setPackResult({ stats: res.deltaStats, card: res.card });
    setPackPhase("revealing");
    setOpening(false);
  };

  const resetSelection = () => {
    setSelectedPack(null);
    setSelectedCardId(null);
    setPackResult(null);
    setPackPhase("idle");
    setStep("selectPack");
  };

  // ================= GACHA CẦU THỦ (SECRET PACK) =================
  const PLAYER_PACKS = [
    { id: "secret", label: "Secret Pack", cost: 50, desc: "Mở ngẫu nhiên 1 cầu thủ với chỉ số ngẫu nhiên." },
  ];

  const [playerPackOpening, setPlayerPackOpening] = useState(false);
  const [playerPackCards, setPlayerPackCards] = useState<CardItem[] | null>(null);
  const [playerPackError, setPlayerPackError] = useState<string>("");
  const [playerPackId, setPlayerPackId] = useState<string | null>(null);

  const handleOpenPlayerPack = async (packId: string) => {
    if (!loggedIn) {
      onLogin();
      return;
    }
    const pack = PLAYER_PACKS.find(p => p.id === packId);
    if (!pack) return;
    if (myBalance < pack.cost) {
        setPlayerPackError("Không đủ COIN để mở Secret Pack.");
      return;
    }
    setPlayerPackError("");
    setPlayerPackId(packId);
    setPlayerPackCards(null);
    setPlayerPackOpening(true);
    try {
      const res = await api("/api/packs/open", {
        method: "POST",
        body: JSON.stringify({ packId }),
      });
      if (res.error) {
        setPlayerPackError(res.error);
        return;
      }
      // Delay nhẹ cho cảm giác đang quay gacha
      const cards = Array.isArray(res.cards)
        ? (res.cards as any[]).map(c => dbCardToFrontend(c, userId))
        : [];
      await new Promise(r => setTimeout(r, 2000));
      setPlayerPackCards(cards.length > 0 ? cards : null);
      if (typeof res.balance === "number") {
        setMyBalance(res.balance);
      }
      onRefresh();
    } catch {
      setPlayerPackError("Có lỗi khi mở pack cầu thủ, thử lại sau.");
    } finally {
      setPlayerPackOpening(false);
    }
  };

  const tierOf = (rating: number) => {
    if (rating >= 91) return "S";
    if (rating >= 81) return "A";
    if (rating >= 71) return "B";
    if (rating >= 61) return "C";
    return "D";
  };

  const [tierTargetId, setTierTargetId] = useState<string | null>(null);
  const [tierFodderIds, setTierFodderIds] = useState<string[]>([]);
  const [tierLoading, setTierLoading] = useState(false);
  const [tierMessage, setTierMessage] = useState<string>("");
  const [tierPhase, setTierPhase] = useState<'idle' | 'shaking' | 'result'>('idle');
  const [tierResult, setTierResult] = useState<{
    success: boolean;
    before: CardItem;
    card: CardItem;
  } | null>(null);

  const tierTarget = myCards.find(c => c.id === tierTargetId) || null;
  const tierFodders = myCards.filter(c => tierFodderIds.includes(c.id));

  const toggleFodder = (id: string) => {
    setTierFodderIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const successPreview = (() => {
    if (!tierTarget || tierFodders.length !== 5) return null;
    const idx = (r: number) => (r >= 91 ? 4 : r >= 81 ? 3 : r >= 71 ? 2 : r >= 61 ? 1 : 0);
    const scores = tierFodders.map((f) => idx(f.rating));
    const bonus = Math.min(
      0.3,
      scores.reduce((s: number, t: number) => s + t, 0) * 0.04
    );
    const chance = 0.6 + bonus;
    return Math.round(chance * 100);
  })();

  const handleTierUp = async () => {
    if (!tierTarget || tierFodders.length !== 5) return;
    setTierLoading(true);
    setTierMessage("");
    setTierPhase('shaking');
    setTierResult(null);
    try {
      const res = await api("/api/cards/tier-up", {
        method: "POST",
        body: JSON.stringify({ targetId: tierTarget.id, fodderIds: tierFodderIds }),
      });
      if (res.error) {
        setTierPhase('idle');
        setTierMessage(res.error);
        setTierLoading(false);
        return;
      }
      // Wait for shake animation (at least 2.5s for suspense)
      await new Promise(r => setTimeout(r, 2500));
      const before = tierTarget;
      const after = res.success ? res.card : tierTarget;
      setTierResult({
        success: res.success,
        before,
        card: after,
      });
      setTierPhase('result');
      if (Array.isArray(res.allCards)) {
        // Làm mới danh sách thẻ sau khi kết quả đã có (không làm mất snapshot chỉ số cũ)
        onRefresh();
      }
    } catch {
      setTierPhase('idle');
      setTierMessage("Có lỗi khi đập thẻ, thử lại sau.");
    } finally {
      setTierLoading(false);
      setTierFodderIds([]);
    }
  };

  const closeTierResult = () => {
    setTierPhase('idle');
    setTierResult(null);
    setTierMessage("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xl font-extrabold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#c6a96b]" />
            NÂNG CẤP & PACK
          </div>
          <div className="text-xs text-amber-100/50 mt-0.5">
            {step === "selectPack" ? "Chọn pack để nâng cấp thẻ hoặc mở pack cầu thủ" : step === "selectCard" ? "Chọn thẻ muốn mở" : "Kết quả mở pack"}
          </div>
        </div>
        {loggedIn && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a1f1b] border border-white/10">
            <Coins className="w-4 h-4 text-[#c6a96b]" />
            <span className="text-sm font-bold text-amber-200">{myBalance} COIN</span>
          </div>
        )}
      </div>

      {/* Player Packs: mở cầu thủ random */}
      <div className="space-y-3 rounded-2xl border border-[#3b2b23] bg-gradient-to-br from-[#241612] to-[#150e0b] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-amber-100 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#f2d97a]" />
              Pack Cầu thủ ngẫu nhiên
            </div>
            <div className="text-[11px] text-amber-100/50">
              Mở để nhận cầu thủ mới. Hạng S rất hiếm, nhưng vẫn có thể mở ra.
            </div>
          </div>
          {playerPackError && (
            <div className="text-[11px] text-red-300 font-medium max-w-xs text-right">
              {playerPackError}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {PLAYER_PACKS.map((pack) => {
            const canAfford = myBalance >= pack.cost;
            return (
              <button
                key={pack.id}
                onClick={() => handleOpenPlayerPack(pack.id)}
                disabled={!loggedIn || !canAfford || playerPackOpening}
                className={
                  "flex-1 min-w-[180px] rounded-xl border px-3 py-3 text-left transition " +
                  (loggedIn && canAfford && !playerPackOpening
                    ? "border-[#c6a96b]/40 bg-[#2a1f1b] hover:bg-[#3b2b23]"
                    : "border-white/10 bg-[#1b1411] opacity-50 cursor-not-allowed")
                }
              >
                <div className="text-[12px] font-bold text-amber-100 mb-1">
                  {pack.label}
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-100/60">
                  <span>{pack.desc}</span>
                  <span className="flex items-center gap-1 font-semibold text-[#f2d97a]">
                    <Coins className="w-3 h-3" />
                    {pack.cost}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Step 1: Select Pack */}
      {step === "selectPack" && (
        <div className="flex flex-wrap justify-center gap-8">
          {PACKS.map((pack) => {
            const canAfford = myBalance >= pack.cost;
            const disabled = !canAfford || !loggedIn;
            const sparkColor =
              pack.id === "silver"
                ? "radial-gradient(circle, #ffffff, #d4d4d8 40%, rgba(148,163,184,.4) 70%, transparent 85%)"
                : pack.id === "gold"
                ? "radial-gradient(circle, #fff8e1, #facc15 40%, rgba(234,179,8,.45) 70%, transparent 85%)"
                : "radial-gradient(circle, #ffe4e6, #f97373 40%, rgba(248,113,113,.45) 70%, transparent 85%)";
            const sparkPos = [
              { left: "18%", top: "68%", d: "0s" },
              { left: "35%", top: "60%", d: ".4s" },
              { left: "62%", top: "63%", d: ".8s" },
              { left: "78%", top: "55%", d: "1.2s" },
              { left: "48%", top: "75%", d: "1.6s" },
            ];
            return (
              <div key={pack.id} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => handlePackSelect(pack.id)}
                  disabled={disabled}
                  className={
                    "pack-hex w-44 h-64 transition-all " +
                    (disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer hover:scale-105")
                  }
                  style={{
                    clipPath:
                      "polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%)",
                    background: `radial-gradient(circle at 20% 0%, #ffffff30 0, transparent 55%), linear-gradient(145deg, ${pack.hexColor}cc 0%, #1a1412 60%, #050403 100%)`,
                    boxShadow: `0 10px 30px rgba(0,0,0,.7), 0 0 22px ${pack.hexColor}55, 0 0 0 1px rgba(255,255,255,.08)`,
                  }}
                >
                  <div
                    className="absolute inset-[2px] bg-gradient-to-b from-white/12 via-transparent to-black/45"
                    style={{
                      clipPath:
                        "polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%)",
                    }}
                  />
                  {sparkPos.map((p, i) => (
                    <span
                      key={i}
                      className="pack-spark"
                      style={{
                        left: p.left,
                        top: p.top,
                        background: sparkColor,
                        animationDelay: p.d,
                      }}
                    />
                  ))}
                </button>
                <div className="text-[11px] text-amber-100/60 text-center max-w-[190px]">
                  {pack.desc}
                </div>
                <div className="text-[11px] text-amber-100/50">
                  Giá:{" "}
                  <span className="font-bold text-[#f2d97a]">
                    {pack.cost} COIN
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 2: Select Card modal */}
      {step === "selectCard" && selectedPack && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetSelection(); }}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-base font-extrabold tracking-wide">Chọn thẻ để nâng</span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: PACKS.find(p => p.id === selectedPack)?.hexColor + "25", color: PACKS.find(p => p.id === selectedPack)?.hexColor }}>
                  {PACKS.find(p => p.id === selectedPack)?.label}
                </span>
              </div>
              <button
                onClick={resetSelection}
                className="rounded-xl bg-white/5 border border-white/[.06] text-amber-200/50 text-xs font-bold hover:bg-white/10 h-8 px-3 transition"
              >
                ← Quay lại
              </button>
            </div>
          
            {myCards.length === 0 ? (
              <div className="text-center py-12 text-amber-100/30 text-sm">Bạn chưa có thẻ nào</div>
            ) : (
              <div className="flex gap-4 flex-wrap justify-center">
                {myCards.map(card => (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (selectedCardId === card.id) {
                        handleOpenPack();
                      } else {
                        handleCardSelect(card.id);
                      }
                    }}
                    className={`cursor-pointer transition-all ${selectedCardId === card.id ? "scale-105" : "hover:scale-105 opacity-60 hover:opacity-100"}`}
                  >
                    <div className="relative">
                      <CardPreview item={card} />
                      {selectedCardId === card.id && (
                        <>
                          <div className="absolute inset-0 pointer-events-none" style={{ clipPath: "polygon(50% 0%, 100% 15%, 100% 85%, 50% 100%, 0% 85%, 0% 15%)", border: "2px solid rgba(242,217,122,.6)", boxShadow: "0 0 24px rgba(242,217,122,.3)" }} />
                          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: "58px" }}>
                            <div
                              className="px-5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] shadow-lg shadow-[#d4a843]/30 whitespace-nowrap animate-pulse cursor-pointer"
                            >
                              {opening ? "Đang mở..." : "Ấn để mở Pack"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Result modal - with pack opening animation */}
      {step === "result" && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}>
          <div className="flex flex-col items-center gap-6 max-w-md w-full px-4">
            {/* Flipping animation phase */}
            {packPhase === "flipping" && (
              <>
                <div className="text-sm font-bold text-amber-200/80 tracking-wider uppercase animate-pulse mb-2">
                  Đang mở pack...
                </div>
                <div className="relative flex items-center justify-center" style={{ perspective: '800px' }}>
                  {/* Burst ring */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="pack-anim-burst" style={{ width: 200, height: 200, background: `radial-gradient(circle, ${PACKS.find(p => p.id === selectedPack)?.hexColor ?? '#c6a96b'}55 0%, transparent 70%)`, animationDelay: '1.5s' }} />
                  </div>
                  {/* Light rays */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="absolute pack-anim-ray" style={{
                      width: 3, height: 120, left: '50%', top: '50%', marginLeft: -1.5, marginTop: -60,
                      background: `linear-gradient(to top, transparent, ${PACKS.find(p => p.id === selectedPack)?.hexColor ?? '#c6a96b'}88, transparent)`,
                      '--rot': `${i * 45}deg`, transformOrigin: 'center center', animationDelay: '1.4s',
                    } as React.CSSProperties} />
                  ))}
                  {/* Spinning card */}
                  <div className="pack-anim-flip" style={{ transformStyle: 'preserve-3d' }}>
                    <div style={{ width: 160, height: 220, borderRadius: 12, background: `linear-gradient(145deg, ${PACKS.find(p => p.id === selectedPack)?.hexColor ?? '#c6a96b'}cc 0%, #1a1412 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${PACKS.find(p => p.id === selectedPack)?.hexColor ?? '#c6a96b'}44` }}>
                      <span className="text-4xl">⚡</span>
                    </div>
                  </div>
                  {/* Sparkles */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    return (
                      <div key={i} className="absolute pack-anim-sparkle" style={{
                        width: 6, height: 6, borderRadius: '50%', left: '50%', top: '50%',
                        background: PACKS.find(p => p.id === selectedPack)?.hexColor ?? '#c6a96b',
                        boxShadow: `0 0 8px ${PACKS.find(p => p.id === selectedPack)?.hexColor ?? '#c6a96b'}`,
                        '--sx': `${Math.cos(angle) * 120}px`, '--sy': `${Math.sin(angle) * 120}px`,
                        animationDelay: `${1.6 + i * 0.05}s`,
                      } as React.CSSProperties} />
                    );
                  })}
                </div>
              </>
            )}

            {/* Revealing results phase */}
            {packPhase === "revealing" && packResult && (
              <>
                {/* Burst effect behind card */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="pack-anim-burst" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)' }} />
                </div>

                <div className="text-center pack-result-fade">
                  <div className="text-xl font-black text-emerald-400 tracking-wide mb-1" style={{ textShadow: '0 0 20px rgba(16,185,129,0.5)' }}>✦ Mở pack thành công! ✦</div>
                  <div className="premium-divider my-3" />
                </div>

                {/* Stat increases with staggered pop animation */}
                <div className="grid grid-cols-4 gap-3 pack-result-fade" style={{ animationDelay: '0.2s' }}>
                  {Object.entries(packResult.stats).map(([k, v], idx) => (
                    <div key={k} className="pack-stat-pop" style={{ animationDelay: `${0.4 + idx * 0.15}s` }}>
                      <div className="flex flex-col items-center px-3 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20" style={{ boxShadow: '0 0 15px rgba(16,185,129,0.15)' }}>
                        <span className="text-[9px] font-bold text-emerald-400/60 tracking-widest">{STAT_LABELS[k] ?? k.toUpperCase()}</span>
                        <span className="text-2xl font-black text-emerald-400 pack-stat-glow">+{v}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-xs text-amber-100/40 pack-result-fade" style={{ animationDelay: '0.8s' }}>
                  OVR mới: <span className="font-black text-[#f2d97a] text-lg pack-stat-glow">{packResult.card.rating}</span>
                </div>

                <div className="flex justify-center pack-result-fade" style={{ animationDelay: '0.6s' }}>
                  <div className="tier-anim-glow p-1 rounded-2xl">
                    <CardPreview item={packResult.card} />
                  </div>
                </div>

                <div className="flex justify-center pack-result-fade" style={{ animationDelay: '1s' }}>
                  <button
                    onClick={() => { resetSelection(); setPackPhase("idle"); }}
                    className="px-8 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] hover:opacity-90 transition shadow-lg shadow-[#d4a843]/20"
                  >
                    Mở thêm pack
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tier Up bằng đập thẻ */}
      {loggedIn && (
        <Card className="bg-[#2a1f1b] border-white/10 mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#c6a96b]" />
              Đập thẻ lên Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-amber-100/60">
              Dùng <span className="font-bold text-amber-100">5 thẻ bất kỳ</span> để nâng tier cho 1 thẻ mục tiêu.
              Tỉ lệ cơ bản <span className="font-bold text-[#f2d97a]">60%</span>, nhiều thẻ tier cao sẽ tăng tỉ lệ và
              có thể vượt cấp. Thẻ hi sinh sẽ được thu hồi về admin.
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-amber-200/70 uppercase tracking-wider">
                1. Chọn thẻ mục tiêu
              </div>
              <div className="flex gap-3 flex-wrap">
                {myCards.map((c) => {
                  const isTarget = c.id === tierTargetId;
                  return (
                    <button
                      key={c.id}
                      onClick={() =>
                        setTierTargetId((prev) => (prev === c.id ? null : c.id))
                      }
                      className={
                        "px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 " +
                        (isTarget
                          ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]"
                          : "bg-[#1f1714] text-amber-200/80 border-white/15 hover:bg-[#2a1f1b]")
                      }
                    >
                      <span>{c.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-bold text-amber-100/70">
                        {tierOf(c.rating)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {tierTarget && (
              <>
                <Separator className="bg-white/10" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-amber-200/70 uppercase tracking-wider">
                      2. Chọn 5 thẻ hi sinh
                    </div>
                    <div className="text-[11px] text-amber-100/50">
                      Đã chọn{" "}
                      <span className="font-bold text-amber-100">
                        {tierFodderIds.length}/5
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {myCards
                      .filter((c) => c.id !== tierTarget.id)
                      .map((c) => {
                        const checked = tierFodderIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleFodder(c.id)}
                            className={
                              "px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 " +
                              (checked
                                ? "bg-red-500/20 text-red-200 border-red-400/50"
                                : "bg-[#1f1714] text-amber-200/80 border-white/15 hover:bg-[#2a1f1b]")
                            }
                          >
                            <span className="truncate max-w-[80px]">
                              {c.name}
                            </span>
                            <span className="px-1 py-0.5 rounded bg-black/40 text-[9px] font-bold text-amber-100/70">
                              {tierOf(c.rating)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
                  <div className="space-y-1 text-xs text-amber-100/70">
                    <div>
                      Tier hiện tại:{" "}
                      <span className="font-bold text-amber-100">
                        {tierOf(tierTarget.rating)}
                      </span>
                    </div>
                    <div>
                      Tỉ lệ thành công dự kiến:{" "}
                      <span className="font-bold text-[#f2d97a]">
                        {successPreview !== null ? `${successPreview}%` : "--"}
                      </span>
                    </div>
                  </div>
                  <Button
                    disabled={
                      tierLoading || !tierTarget || tierFodderIds.length !== 5
                    }
                    onClick={handleTierUp}
                    className="rounded-lg bg-red-500/80 text-white font-bold hover:bg-red-500 px-6 h-9 text-sm"
                  >
                    {tierLoading ? "Đang đập thẻ..." : "Đập thẻ nâng tier"}
                  </Button>
                </div>

                {tierMessage && (
                  <div className="text-xs text-center mt-1 text-amber-100/60">
                    {tierMessage}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tier Up Animation Overlay */}
      {tierPhase !== 'idle' && tierTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col items-center gap-6">
            {/* Shaking phase */}
            {tierPhase === 'shaking' && (
              <>
                <div className="text-sm font-bold text-amber-200/80 tracking-wider uppercase mb-2 animate-pulse">
                  Đang đập thẻ...
                </div>
                <div className="relative flex items-center justify-center">
                  {/* Energy rings */}
                  {[0, 1, 2].map(i => (
                    <div key={i} className="absolute rounded-full border border-[#c6a96b]/30 tier-anim-energy" style={{
                      width: 220, height: 220,
                      animationDelay: `${i * 0.5}s`,
                    }} />
                  ))}
                  <div className="tier-anim-pulse">
                    <div style={{ transform: 'scale(0.85)', transformOrigin: 'center center' }}>
                      <CardPreview item={tierTarget} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 mt-4">
                  {tierFodders.map((f, i) => (
                    <div key={f.id} className="tier-anim-fodder-fade" style={{
                      animationDelay: `${0.3 + i * 0.35}s`,
                      width: 58, height: 82, overflow: 'hidden', borderRadius: 6,
                    }}>
                      <div style={{ transform: 'scale(0.24)', transformOrigin: 'top left', width: 240, height: 340 }}>
                        <CardPreview item={f} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-amber-100/40 mt-2">
                  Tỉ lệ: <span className="font-bold text-[#f2d97a]">{successPreview}%</span>
                </div>
              </>
            )}

            {/* Result phase */}
            {tierPhase === 'result' && tierResult && (
              <>
                {tierResult.success ? (
                  <>
                    {/* Explosion effect */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="tier-success-explode" style={{ width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,217,122,0.5) 0%, rgba(198,169,107,0.2) 40%, transparent 70%)' }} />
                    </div>
                    {/* Star particles */}
                    {Array.from({ length: 16 }).map((_, i) => {
                      const angle = (i / 16) * Math.PI * 2;
                      return (
                        <div key={i} className="absolute tier-star-burst" style={{
                          left: '50%', top: '45%', width: 8, height: 8,
                          background: i % 2 === 0 ? '#f2d97a' : '#c6a96b',
                          borderRadius: i % 3 === 0 ? '50%' : '2px',
                          boxShadow: `0 0 6px ${i % 2 === 0 ? '#f2d97a' : '#c6a96b'}`,
                          '--tx': `${Math.cos(angle) * (100 + Math.random() * 80)}px`,
                          '--ty': `${Math.sin(angle) * (100 + Math.random() * 80)}px`,
                          animationDelay: `${Math.random() * 0.3}s`,
                        } as React.CSSProperties} />
                      );
                    })}

                    <div className="text-lg font-black text-[#f2d97a] tracking-wider uppercase mb-2 pack-result-fade" style={{ textShadow: '0 0 30px rgba(242,217,122,0.6), 0 0 60px rgba(242,217,122,0.3)' }}>
                      ✦ Đập thẻ thành công! ✦
                    </div>
                    <div className="tier-anim-reveal">
                      <div className="tier-anim-glow p-2">
                        <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center' }}>
                          <CardPreview item={tierResult.card} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 mt-3">
                      <div className="text-sm text-amber-100/80 pack-result-fade" style={{ animationDelay: '0.3s' }}>
                        Tier mới: <span className="font-black text-xl text-[#f2d97a] pack-stat-glow">{tierOf(tierResult.card.rating)}</span>
                      </div>
                      <div className="text-sm text-amber-100/80 pack-result-fade" style={{ animationDelay: '0.5s' }}>
                        OVR: <span className="font-bold text-amber-100">{tierResult.before.rating}</span> → <span className="font-black text-lg text-[#f2d97a] pack-stat-glow">{tierResult.card.rating}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        {[
                          { label: 'ATK', old: tierResult.before.atk, now: tierResult.card.atk },
                          { label: 'DEF', old: tierResult.before.def, now: tierResult.card.def },
                          { label: 'PAS', old: tierResult.before.pas, now: tierResult.card.pas },
                          { label: 'IMP', old: tierResult.before.imp, now: tierResult.card.imp },
                        ].map((s, idx) => (
                          <div key={s.label} className="pack-stat-pop" style={{ animationDelay: `${0.6 + idx * 0.15}s` }}>
                            <div className="flex flex-col items-center px-2 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <span className="text-[9px] font-bold text-amber-400/60 tracking-widest">{s.label}</span>
                              <span className="text-xs text-amber-100/50">{s.old}</span>
                              <span className="text-lg font-black text-[#f2d97a] pack-stat-glow">{s.now}</span>
                              {s.now > s.old && <span className="text-[10px] font-bold text-emerald-400">+{s.now - s.old}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Shake + crack effect for failure */}
                    <div className="text-lg font-black text-red-400 tracking-wider uppercase mb-2" style={{ textShadow: '0 0 20px rgba(248,113,113,0.4)' }}>
                      ✖ Đập thẻ thất bại ✖
                    </div>
                    <div className="tier-anim-fail">
                      <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center', filter: 'grayscale(0.3)' }}>
                        <CardPreview item={tierResult.card} />
                      </div>
                    </div>
                    <div className="text-sm text-red-300/80 mt-3 pack-result-fade" style={{ animationDelay: '0.3s' }}>
                      5 thẻ hi sinh đã bị thu hồi
                    </div>
                    <div className="text-xs text-amber-100/40 pack-result-fade" style={{ animationDelay: '0.5s' }}>
                      Thẻ mục tiêu không bị ảnh hưởng
                    </div>
                  </>
                )}
                <button
                  onClick={closeTierResult}
                  className="mt-4 px-8 py-2.5 rounded-xl bg-[#c6a96b] text-[#1a1412] font-bold text-sm hover:bg-[#d4b876] transition"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Player Pack Animation Overlay (full screen, giống overlay đập thẻ) */}
      {(playerPackOpening || (playerPackCards && playerPackCards.length > 0)) && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          {playerPackOpening ? (
            <div className="flex flex-col items-center gap-6 max-h-[90vh] overflow-hidden">
              <div className="text-sm font-bold text-amber-200/80 tracking-wider uppercase mb-2 animate-pulse">
                Đang mở pack cầu thủ...
              </div>
              <div className="relative flex items-center justify-center">
                {/* Energy rings giống đập thẻ */}
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-[#c6a96b]/30 tier-anim-energy"
                    style={{ width: 220, height: 220, animationDelay: `${i * 0.5}s` }}
                  />
                ))}
                {/* Burst ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="pack-anim-burst"
                    style={{
                      width: 220,
                      height: 220,
                      background: 'radial-gradient(circle, rgba(242,217,122,0.4) 0%, transparent 70%)',
                      animationDelay: '1.5s',
                    }}
                  />
                </div>
                {/* Spinning pack card */}
                <div className="pack-anim-flip" style={{ transformStyle: 'preserve-3d' }}>
                  <div
                    style={{
                      width: 180,
                      height: 240,
                      borderRadius: 16,
                      background: 'linear-gradient(145deg, #f2d97a 0%, #8b6914 40%, #1a1412 80%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 40px rgba(242,217,122,0.5)',
                    }}
                  >
                    <span className="text-4xl">★</span>
                  </div>
                </div>
                {/* Sparkles */}
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  return (
                    <div
                      key={i}
                      className="absolute pack-anim-sparkle"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        left: '50%',
                        top: '50%',
                        background: '#f2d97a',
                        boxShadow: '0 0 8px #f2d97a',
                        '--sx': `${Math.cos(angle) * 120}px`,
                        '--sy': `${Math.sin(angle) * 120}px`,
                        animationDelay: `${1.6 + i * 0.05}s`,
                      } as React.CSSProperties}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto max-h-[90vh] overflow-y-auto pb-6">
              <div className="text-sm font-bold text-amber-200/80 tracking-wider uppercase mb-1">
                Bạn vừa nhận được
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {playerPackCards?.map((card, idx) => (
                  <div
                    key={card.id}
                    className="w-[130px] flex flex-col items-center gap-1 pack-anim-flip"
                    style={{ animationDelay: `${idx * 0.15}s` }}
                  >
                    <div style={{ transform: 'scale(0.75)', transformOrigin: 'center center' }}>
                      <CardPreview item={card} />
                    </div>
                    <div className="text-[11px] text-center text-amber-100/80 font-semibold truncate w-full">
                      {card.name}
                    </div>
                    <div className="text-[10px] text-amber-100/50">
                      OVR {card.rating}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setPlayerPackCards(null); }}
                className="mt-4 px-8 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] hover:opacity-90 transition shadow-lg shadow-[#d4a843]/20"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================= MARKETPLACE =================
function MarketPage({ allCards, balance, loggedIn, isAdmin, userId, onLogin, onRefresh }: {
  allCards: CardItem[];
  balance: number;
  loggedIn: boolean;
  isAdmin: boolean;
  userId: number;
  onLogin: () => void;
  onRefresh: () => void;
}) {
  type FixedPackDto = { id: number; name: string; seasonKey: string; status: string; cost: number; poolSize: number };
  type FixedPackItemDto = {
    id: number;
    packId: number;
    sortOrder: number;
    name: string;
    nation: string;
    position: string;
    rating: number;
    atk: number;
    def: number;
    pas: number;
    imp: number;
    series: string;
    region: string;
    effect?: string | null;
    avatarText?: string | null;
    avatarTextColor: string;
    avatarColorMode: number;
    avatarColor1: string;
    avatarColor2: string;
    avatarColor3: string;
  };

  // Thẻ user: chỉ có 1 bản, bán xong là xoá nên chỉ cần c.listed.
  // Thẻ shop admin: dùng stock để hiển thị SOLD OUT khi stock <= 0, nên vẫn giữ lại trong danh sách.
  const marketCards = allCards.filter(
    c => c.listed && (c.ownerRole === "admin" || (c.stock ?? 0) > 0),
  );
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [marketPage, setMarketPage] = useState(1);
  const MARKET_PER_PAGE = 9;
  const [subTab, setSubTab] = useState<"market" | "pack">("market");
  
  // Daily Pack state
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [dailyChecking, setDailyChecking] = useState(true);
  const [dailySpinning, setDailySpinning] = useState(false);
  const [dailyResult, setDailyResult] = useState<{ type: "card" | "coin"; value: number; card?: any } | null>(null);
  const [dailyRotation, setDailyRotation] = useState(0);

  // Fixed Pack state
  const [fixedPack, setFixedPack] = useState<FixedPackDto | null>(null);
  const [fixedPackItems, setFixedPackItems] = useState<FixedPackItemDto[]>([]);
  const [fixedClaimedIds, setFixedClaimedIds] = useState<number[]>([]);
  const [fixedClaimedCount, setFixedClaimedCount] = useState(0);
  const [fixedTarget, setFixedTarget] = useState(0);
  const [fixedLoading, setFixedLoading] = useState(false);
  const [fixedError, setFixedError] = useState<string | null>(null);
  const [fixedSpinning, setFixedSpinning] = useState(false);
  const [fixedRewardCard, setFixedRewardCard] = useState<CardItem | null>(null);
  const [fixedRewardName, setFixedRewardName] = useState<string | null>(null);

  // Admin management state (only used when isAdmin)
  const [adminPacks, setAdminPacks] = useState<any[]>([]);
  const [adminSelectedPackId, setAdminSelectedPackId] = useState<number | null>(null);
  const [adminPackDetail, setAdminPackDetail] = useState<{
    pack: FixedPackDto | null;
    items: FixedPackItemDto[];
  } | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [newPackName, setNewPackName] = useState("Season Pack");
  const [newPackSeasonKey, setNewPackSeasonKey] = useState("2026-03");
  const [newPackPoolSize, setNewPackPoolSize] = useState(15);
  const [newPackCost, setNewPackCost] = useState(100);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCardId, setTemplateCardId] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemPosition, setEditItemPosition] = useState<Position>("CM");
  const [editItemEffect, setEditItemEffect] = useState("");
  const [editItemRating, setEditItemRating] = useState(0);
  const [editItemAtk, setEditItemAtk] = useState(0);
  const [editItemDef, setEditItemDef] = useState(0);
  const [editItemPas, setEditItemPas] = useState(0);
  const [editItemImp, setEditItemImp] = useState(0);
  const [editItemAvatarStyle, setEditItemAvatarStyle] = useState<AvatarStyle>({ ...DEFAULT_AVATAR_STYLE });
  const [newItemName, setNewItemName] = useState("");
  const [newItemPosition, setNewItemPosition] = useState<Position>("CM");
  const [newItemRating, setNewItemRating] = useState(70);
  const [newItemImp, setNewItemImp] = useState(60);
  
  useEffect(() => {
    if (!loggedIn) {
      setDailyChecking(false);
      return;
    }
    (async () => {
      try {
        const res = await api("/api/daily-reward");
        setDailyClaimed(res.claimed ?? false);
      } catch {
        setDailyClaimed(false);
      } finally {
        setDailyChecking(false);
      }
    })();
  }, [loggedIn]);

  const loadFixedPack = useCallback(async () => {
    setFixedLoading(true);
    setFixedError(null);
    try {
      const res = await api("/api/market/fixed-pack");
      if (res?.error) {
        setFixedError(String(res.error));
        setFixedPack(null);
        setFixedPackItems([]);
        setFixedClaimedIds([]);
        setFixedClaimedCount(0);
        setFixedTarget(0);
        return;
      }
      setFixedPack(res?.pack ?? null);
      setFixedPackItems(Array.isArray(res?.items) ? res.items : []);
      setFixedClaimedIds(Array.isArray(res?.claimedItemIds) ? res.claimedItemIds : []);
      setFixedClaimedCount(Number(res?.claimedCount ?? 0));
      setFixedTarget(Number(res?.target ?? 0));
    } catch {
      setFixedError("Không tải được pack");
    } finally {
      setFixedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab !== "pack") return;
    loadFixedPack();
  }, [subTab, loggedIn, loadFixedPack]);

  const handleFixedSpin = async () => {
    if (!loggedIn) return;
    if (fixedSpinning) return;
    if (!fixedPack) return;
    if (fixedTarget > 0 && fixedClaimedCount >= fixedTarget) return;
    if (!isAdmin && balance < 100) return;
    setFixedSpinning(true);
    try {
      const res = await api("/api/market/fixed-pack/spin", { method: "POST", body: JSON.stringify({ packId: fixedPack.id }) });
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (res?.rewardCard) {
        setFixedRewardCard(dbCardToFrontend(res.rewardCard, userId));
      }
      const pickedId = Number(res?.pickedItemId);
      if (Number.isFinite(pickedId)) {
        const it = fixedPackItems.find(x => x.id === pickedId);
        setFixedRewardName(it?.name ?? null);
        setFixedClaimedIds(prev => (prev.includes(pickedId) ? prev : [...prev, pickedId]));
      }
      setFixedClaimedCount(Number(res?.claimedCount ?? fixedClaimedCount));
      onRefresh();
    } finally {
      setFixedSpinning(false);
    }
  };

  const loadAdminPacks = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api("/api/admin/fixed-pack");
      if (Array.isArray(res)) {
        setAdminPacks(res);
        if (!adminSelectedPackId) {
          const active = res.find((p) => p.status === "active");
          setAdminSelectedPackId(active?.id ?? res[0]?.id ?? null);
        }
      }
    } catch { /* ignore */ }
  }, [isAdmin, adminSelectedPackId]);

  const loadAdminPackDetail = useCallback(async (pid: number) => {
    try {
      const res = await api(`/api/market/fixed-pack?packId=${pid}`);
      setAdminPackDetail({ pack: res?.pack ?? null, items: Array.isArray(res?.items) ? res.items : [] });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (subTab !== "pack" || !isAdmin) return;
    loadAdminPacks();
  }, [subTab, isAdmin, loadAdminPacks]);

  useEffect(() => {
    if (subTab !== "pack" || !isAdmin) return;
    if (!adminSelectedPackId) return;
    loadAdminPackDetail(adminSelectedPackId);
  }, [subTab, isAdmin, adminSelectedPackId, loadAdminPackDetail]);

  const adminUpdatePack = async (patch: Record<string, unknown>) => {
    if (!isAdmin || !adminSelectedPackId) return;
    setAdminSaving(true);
    try {
      const res = await api("/api/admin/fixed-pack", { method: "PUT", body: JSON.stringify({ id: adminSelectedPackId, ...patch }) });
      if (res?.error) {
        alert(res.error);
        return;
      }
      await loadAdminPacks();
      await loadAdminPackDetail(adminSelectedPackId);
      await loadFixedPack();
    } finally {
      setAdminSaving(false);
    }
  };

  const adminCreatePack = async () => {
    if (!isAdmin) return;
    setAdminSaving(true);
    try {
      const res = await api("/api/admin/fixed-pack", {
        method: "POST",
        body: JSON.stringify({ name: newPackName, seasonKey: newPackSeasonKey, poolSize: newPackPoolSize, cost: newPackCost }),
      });
      if (res?.error) {
        alert(res.error);
        return;
      }
      await loadAdminPacks();
      if (res?.id) {
        setAdminSelectedPackId(res.id);
        await loadAdminPackDetail(res.id);
      }
    } finally {
      setAdminSaving(false);
    }
  };

  const adminAddItemFromTemplate = async () => {
    if (!isAdmin || !adminSelectedPackId || !templateCardId) return;
    setAdminSaving(true);
    try {
      const res = await api("/api/admin/fixed-pack/items", {
        method: "POST",
        body: JSON.stringify({ packId: adminSelectedPackId, templateCardId }),
      });
      if (res?.error) {
        alert(res.error);
        return;
      }
      setTemplateCardId("");
      await loadAdminPackDetail(adminSelectedPackId);
      await loadFixedPack();
    } finally {
      setAdminSaving(false);
    }
  };

  const adminRemoveItem = async (itemId: number) => {
    if (!isAdmin) return;
    if (!confirm("Xoá cầu thủ này khỏi pack?")) return;
    setAdminSaving(true);
    try {
      const res = await api("/api/admin/fixed-pack/items", { method: "DELETE", body: JSON.stringify({ itemId }) });
      if (res?.error) {
        alert(res.error);
        return;
      }
      if (adminSelectedPackId) await loadAdminPackDetail(adminSelectedPackId);
      await loadFixedPack();
    } finally {
      setAdminSaving(false);
    }
  };

  const adminStartEditItem = (item: FixedPackItemDto) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemPosition(item.position as Position);
    setEditItemEffect(item.effect ?? "");
    setEditItemRating(item.rating);
    setEditItemAtk(item.atk);
    setEditItemDef(item.def);
    setEditItemPas(item.pas);
    setEditItemImp(item.imp);
    setEditItemAvatarStyle({
      text: item.avatarText ?? undefined,
      textColor: item.avatarTextColor ?? "#FFFFFF",
      colorMode: (item.avatarColorMode ?? 1) as ColorMode,
      colors: [item.avatarColor1 ?? "#8b6914", item.avatarColor2 ?? "#8b6914", item.avatarColor3 ?? "#8b6914"],
    });
  };

  const adminSaveEditItem = async () => {
    if (!isAdmin || !editingItemId) return;
    setAdminSaving(true);
    try {
      const res = await api("/api/admin/fixed-pack/items", {
        method: "PUT",
        body: JSON.stringify({
          itemId: editingItemId,
          name: editItemName,
          position: editItemPosition,
          rating: editItemRating,
          atk: editItemAtk,
          def: editItemDef,
          pas: editItemPas,
          imp: editItemImp,
          effect: editItemEffect || null,
          avatarText: editItemAvatarStyle.text || null,
          avatarTextColor: editItemAvatarStyle.textColor,
          avatarColorMode: editItemAvatarStyle.colorMode,
          avatarColor1: editItemAvatarStyle.colors[0],
          avatarColor2: editItemAvatarStyle.colors[1],
          avatarColor3: editItemAvatarStyle.colors[2],
        }),
      });
      if (res?.error) {
        alert(res.error);
        return;
      }
      setEditingItemId(null);
      if (adminSelectedPackId) await loadAdminPackDetail(adminSelectedPackId);
      await loadFixedPack();
    } finally {
      setAdminSaving(false);
    }
  };

  const adminAddNewItem = async () => {
    if (!isAdmin || !adminSelectedPackId || !newItemName.trim()) return;
    setAdminSaving(true);
    try {
      const res = await api("/api/admin/fixed-pack/items", {
        method: "POST",
        body: JSON.stringify({
          packId: adminSelectedPackId,
          item: {
            name: newItemName.trim(),
            position: newItemPosition,
            rating: newItemRating,
            atk: newItemRating,
            def: newItemRating,
            pas: newItemRating,
            imp: newItemImp || newItemRating,
          },
        }),
      });
      if (res?.error) {
        alert(res.error);
        return;
      }
      setNewItemName("");
      setNewItemRating(70);
      setNewItemImp(60);
      setNewItemPosition("CM");
      if (adminSelectedPackId) await loadAdminPackDetail(adminSelectedPackId);
      await loadFixedPack();
    } finally {
      setAdminSaving(false);
    }
  };

  const handleDailySpin = async () => {
    if (dailySpinning || dailyClaimed) return;
    setDailySpinning(true);
    setDailyResult(null);
    
    try {
      const res = await api("/api/daily-reward", { method: "POST" });
      if (res.error) {
        alert(res.error);
        setDailySpinning(false);
        return;
      }
      
      const baseRotation = dailyRotation + 1080 + Math.random() * 720;
      setDailyRotation(baseRotation);
      
      setTimeout(() => {
        setDailyResult(res.reward);
        setDailyClaimed(true);
        setDailySpinning(false);
        onRefresh();
      }, 2000);
    } catch {
      alert("Lỗi khi quay thưởng");
      setDailySpinning(false);
    }
  };

  const filtered = marketCards
    .filter(c => {
      if (posFilter !== "ALL" && c.position !== posFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.rating - a.rating);

  const totalMarketPages = Math.max(1, Math.ceil(filtered.length / MARKET_PER_PAGE));
  const clampedPage = Math.min(marketPage, totalMarketPages);
  const paginatedCards = filtered.slice((clampedPage - 1) * MARKET_PER_PAGE, clampedPage * MARKET_PER_PAGE);

  const [buyingProcessingId, setBuyingProcessingId] = useState<string | null>(null);

  const handleBuy = async (card: CardItem) => {
    if (!card.listed) return;
    if (!isAdmin && balance < card.listed.price) return;
    if (buyingProcessingId === card.id) return;
    setBuyingProcessingId(card.id);
    try {
      const res = await api("/api/market/buy", { method: "POST", body: JSON.stringify({ cardId: card.id }) });
      if (res.error) return;
      setBuyingId(null);
      onRefresh();
    } finally {
      setBuyingProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xl font-extrabold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#c6a96b]" />
            MARKETPLACE
          </div>
          <div className="text-xs text-amber-100/50 mt-0.5">Mua thẻ từ người chơi khác</div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Daily Pack Widget */}
          {loggedIn && (
            <button
              onClick={handleDailySpin}
              disabled={dailySpinning || dailyClaimed || dailyChecking}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                dailyClaimed 
                  ? "bg-[#2a1f1b]/50 border border-white/10 text-amber-200/50 cursor-not-allowed" 
                  : dailySpinning
                  ? "bg-gradient-to-r from-[#c6a96b]/40 to-[#f2d97a]/20 border border-[#c6a96b]/40 text-[#f2d97a] cursor-wait"
                  : "bg-gradient-to-r from-[#c6a96b]/30 to-[#f2d97a]/15 border border-[#c6a96b]/40 text-[#f2d97a] hover:from-[#c6a96b]/40 hover:to-[#f2d97a]/25 hover:border-[#c6a96b]/60 hover:shadow-lg hover:shadow-[#c6a96b]/20"
              }`}
            >
              <Sparkles className={`w-4 h-4 ${dailySpinning ? "animate-spin" : ""}`} />
              <span>{dailyChecking ? "..." : dailyClaimed ? "Đã nhận hôm nay" : "Daily Pack"}</span>
              {!dailyClaimed && !dailyChecking && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          )}
        {loggedIn && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a1f1b] border border-white/10">
            <Coins className="w-4 h-4 text-[#c6a96b]" />
            <span className="text-sm font-bold text-amber-200">{balance}COIN</span>
          </div>
        )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="glass-nav rounded-xl p-1 inline-flex gap-1 w-fit">
        <button
          onClick={() => setSubTab("market")}
          className={`glass-nav-btn ${subTab === "market" ? "active" : ""}`}
        >
          <span className="flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Marketplace
          </span>
        </button>
        <button
          onClick={() => setSubTab("pack")}
          className={`glass-nav-btn ${subTab === "pack" ? "active" : ""}`}
        >
          <span className="flex items-center gap-1.5">
            <Gem className="w-3.5 h-3.5" />
            Pack
          </span>
        </button>
      </div>
      
      {/* Daily Pack Result Modal */}
      {dailyResult && (
        <div className="modal-overlay" onClick={() => setDailyResult(null)} style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.4s ease-out" }}>
            {dailyResult.type === "card" ? (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <div className="text-3xl font-black text-[#f2d97a] tracking-wider" style={{ textShadow: '0 0 30px rgba(242,217,122,0.6)' }}>
                    🎉 CHÚC MỪNG!
                  </div>
                  <div className="text-sm text-amber-200/70 font-semibold">Bạn nhận được thẻ cầu thủ!</div>
                </div>
                
                {dailyResult.card && (
                  <div className="flex flex-col items-center gap-3 pack-anim-flip">
                    <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center' }}>
                      <CardPreview item={dbCardToFrontend(dailyResult.card, userId)} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-white">{dailyResult.card.name}</div>
                      <div className="text-sm text-amber-200/80">{dailyResult.card.position} • OVR {dailyResult.card.rating}</div>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={() => { setDailyResult(null); onRefresh(); }} 
                  className="w-full px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] hover:opacity-90 transition shadow-lg shadow-[#d4a843]/20"
                >
                  Tuyệt vời!
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <div className="text-5xl animate-bounce">💰</div>
                  <div className="text-3xl font-black text-[#f2d97a] tracking-wider" style={{ textShadow: '0 0 30px rgba(242,217,122,0.6)' }}>
                    NHẬN COIN!
                  </div>
                </div>
                
                <div className="relative">
                  <div className="text-6xl font-black text-[#22c55e] animate-pulse" style={{ textShadow: '0 0 40px rgba(34,197,94,0.5)' }}>
                    +{dailyResult.value}
                  </div>
                  <div className="text-xl font-bold text-amber-200 mt-2">COIN</div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-[#22c55e] rounded-full animate-ping"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(${Math.cos(i * Math.PI / 4) * 60}px, ${Math.sin(i * Math.PI / 4) * 60}px)`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '1.5s',
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={() => { setDailyResult(null); onRefresh(); }} 
                  className="w-full px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] hover:opacity-90 transition shadow-lg shadow-[#d4a843]/20"
                >
                  Tuyệt vời!
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === "market" ? (
        <>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-100/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm thẻ..."
                className="bg-[#2a1f1b] border-white/10 text-amber-50 pl-10"
              />
            </div>
            <div className="flex gap-1.5">
              {["ALL", "GK", "CB", "CM", "ST"].map(pos => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={
                    "px-3 py-2 rounded-lg text-xs font-bold border transition " +
                    (posFilter === pos
                      ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]"
                      : "bg-[#2a1f1b] text-amber-200/70 border-white/10 hover:bg-[#3b2b23]")
                  }
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 text-amber-100/20 mx-auto mb-3" />
              <div className="text-lg font-bold text-amber-100/40">Không có thẻ nào</div>
              <div className="text-sm text-amber-100/30">Hãy quay lại sau hoặc thay đổi bộ lọc</div>
            </div>
          ) : (
            <>
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {paginatedCards.map(card => (
                <div key={card.id} className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <CardPreview item={card} />
                    {card.ownerRole === "admin" && card.stock <= 0 && (
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center overflow-hidden">
                        <div className="absolute w-[200%] text-center py-1.5 bg-red-600 text-white text-sm font-black tracking-widest uppercase" style={{ transform: 'rotate(-35deg)' }}>
                          SOLD OUT
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-full max-w-[240px] space-y-2">
                    <div className="flex items-center justify-between px-2">
                      <div className="text-xs text-amber-100/50">
                        {card.ownerId === userId ? (
                          <span className="font-bold text-amber-200/70">Thẻ của bạn</span>
                        ) : (
                          <>Seller: <span className="font-bold text-amber-200/70">{card.owner}</span></>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {card.ownerRole === "admin" && (
                        <span className={"text-[10px] font-bold px-1.5 py-0.5 rounded " + (card.stock > 0 ? "bg-green-500/15 text-green-400 border border-green-500/25" : "bg-red-500/15 text-red-400 border border-red-500/25")}>
                          {card.stock > 0 ? `Còn ${card.stock}` : "Hết hàng"}
                        </span>
                        )}
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-[#f2d97a]" />
                          <span className="text-sm font-extrabold text-[#f2d97a]">{card.listed!.price}</span>
                        </div>
                      </div>
                    </div>
                    {!loggedIn ? (
                      <button
                        onClick={onLogin}
                        className="w-full text-center py-2 rounded-lg bg-[#c6a96b]/10 border border-[#c6a96b]/20 text-xs font-bold text-[#c6a96b]/70 hover:bg-[#c6a96b]/20 transition"
                      >
                        <Lock className="w-3 h-3 inline mr-1.5 align-middle" />
                        Đăng nhập để mua
                      </button>
                    ) : card.ownerId === userId ? (
                      <div className="text-center py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-200/60">
                        THẺ CỦA BẠN — Quản lý ở My Card
                      </div>
                    ) : card.ownerRole === "admin" && card.stock <= 0 ? (
                      <div className="text-center py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-300/70">
                        HẾT HÀNG
                      </div>
                    ) : buyingId === card.id ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleBuy(card)}
                          disabled={buyingProcessingId === card.id || (!isAdmin && balance < card.listed!.price)}
                          className="flex-1 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 text-xs"
                        >
                          {buyingProcessingId === card.id
                            ? "Đang mua..."
                            : !isAdmin && balance < card.listed!.price
                            ? "Không đủ COIN"
                            : "Xác nhận mua"}
                        </Button>
                        <Button
                          onClick={() => setBuyingId(null)}
                          disabled={buyingProcessingId === card.id}
                          className="rounded-lg bg-[#2a1f1b] border border-white/10 text-amber-200/70 font-bold hover:bg-[#3b2b23] text-xs"
                        >
                          Huỷ
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setBuyingId(card.id)}
                        className="w-full rounded-lg bg-[#c6a96b] text-[#1a1412] font-bold hover:bg-[#d4b86b]"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1.5" />
                        {isAdmin ? `Mua miễn phí (Admin)` : `Mua ${card.listed!.price} COIN`}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalMarketPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setMarketPage(p => Math.max(1, p - 1))}
                  disabled={clampedPage <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-[#2a1f1b] text-amber-200/70 hover:bg-[#3b2b23] transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                {Array.from({ length: totalMarketPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setMarketPage(p)}
                    className={
                      "w-8 h-8 rounded-lg text-xs font-bold border transition " +
                      (p === clampedPage
                        ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]"
                        : "bg-[#2a1f1b] text-amber-200/70 border-white/10 hover:bg-[#3b2b23]")
                    }
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setMarketPage(p => Math.min(totalMarketPages, p + 1))}
                  disabled={clampedPage >= totalMarketPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-[#2a1f1b] text-amber-200/70 hover:bg-[#3b2b23] transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </button>
                <span className="text-[10px] text-amber-100/40 ml-2">{filtered.length} thẻ</span>
              </div>
            )}
            </>
          )}
        </>
      ) : (
        <>
          {/* Fixed Pack Reward Modal */}
          {fixedRewardCard && (
            <div className="modal-overlay" onClick={() => { setFixedRewardCard(null); setFixedRewardName(null); }} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.4s ease-out" }}>
                <div className="text-center space-y-5">
                  <div className="space-y-2">
                    <div className="text-3xl font-black text-[#f2d97a] tracking-wider" style={{ textShadow: "0 0 30px rgba(242,217,122,0.6)" }}>
                      🎁 NHẬN THẺ!
                    </div>
                    <div className="text-sm text-amber-200/70 font-semibold">
                      {fixedRewardName ? <>Bạn đã nhận <span className="text-amber-100 font-extrabold">{fixedRewardName}</span></> : "Bạn đã nhận được 1 thẻ"}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3 pack-anim-flip">
                    <div style={{ transform: "scale(0.9)", transformOrigin: "center center" }}>
                      <CardPreview item={fixedRewardCard} />
                    </div>
                    <div className="text-sm text-amber-200/60">OVR {fixedRewardCard.rating} • IMP {fixedRewardCard.imp}</div>
                  </div>
                  <Button
                    onClick={() => { setFixedRewardCard(null); setFixedRewardName(null); onRefresh(); }}
                    className="w-full px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] hover:opacity-90 transition shadow-lg shadow-[#d4a843]/20"
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Pack panel */}
          <div className="glass-panel p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="text-lg font-extrabold text-amber-100">
                  {fixedPack ? fixedPack.name : "PACK"}
                  {fixedPack?.seasonKey ? <span className="ml-2 text-xs text-amber-200/45 font-bold">({fixedPack.seasonKey})</span> : null}
                </div>
                <div className="text-xs text-amber-100/50">
                  Pool gồm các cầu thủ hay nhất tuần, mỗi lượt quay có cơ hội nhận 1 thẻ trong danh sách này.
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {!loggedIn ? (
                  <Button onClick={onLogin} className="rounded-xl bg-[#2a1f1b] border border-white/10 text-amber-200/80 font-bold hover:bg-[#3b2b23]">
                    <Lock className="w-4 h-4 mr-2" />
                    Đăng nhập để quay
                  </Button>
                ) : (
                  <Button
                    onClick={handleFixedSpin}
                    disabled={fixedSpinning || !fixedPack || (fixedTarget > 0 && fixedClaimedCount >= fixedTarget) || (!isAdmin && balance < 100)}
                    className="rounded-xl bg-gradient-to-r from-[#c6a96b] to-[#f2d97a] text-[#1a1412] font-black hover:opacity-90 disabled:opacity-40"
                  >
                    <Sparkles className={`w-4 h-4 mr-2 ${fixedSpinning ? "animate-spin" : ""}`} />
                    {fixedTarget > 0 && fixedClaimedCount >= fixedTarget ? "Đã hoàn thành" : "Quay 100 COIN"}
                  </Button>
                )}
                <button
                  onClick={loadFixedPack}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
                  title="Tải lại pack"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-200/70 ${fixedLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* progress */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-100/60">
                <span>Tiến độ</span>
                <span className="font-extrabold text-amber-100/85">{fixedClaimedCount}/{fixedTarget || 0}</span>
              </div>
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#c6a96b] to-[#f2d97a] transition-all duration-500"
                  style={{ width: `${fixedTarget > 0 ? Math.min(100, Math.max(0, (fixedClaimedCount / fixedTarget) * 100)) : 0}%` }}
                />
              </div>
              {fixedError && <div className="text-xs text-red-300/80">{fixedError}</div>}
            </div>
          </div>

          {/* pool preview */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-200/50 uppercase tracking-widest">Pool</div>
            {fixedLoading ? (
              <div className="text-sm text-amber-100/40">Đang tải...</div>
            ) : !fixedPack ? (
              <div className="text-sm text-amber-100/40">Chưa có pack nào đang mở.</div>
            ) : fixedPackItems.length === 0 ? (
              <div className="text-sm text-amber-100/40">Pack chưa có cầu thủ.</div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                {fixedPackItems.map((it) => {
                  const claimed = fixedClaimedIds.includes(it.id);
                  const card: CardItem = {
                    id: `fpitem-${it.id}`,
                    name: it.name,
                    nation: it.nation,
                    position: it.position as Position,
                    rating: it.rating,
                    atk: it.atk,
                    def: it.def,
                    pas: it.pas,
                    imp: it.imp,
                    series: it.series as any,
                    region: it.region as any,
                    effect: it.effect ?? undefined,
                    avatarStyle: {
                      text: it.avatarText ?? undefined,
                      textColor: it.avatarTextColor ?? "#FFFFFF",
                      colorMode: (it.avatarColorMode ?? 1) as any,
                      colors: [it.avatarColor1 ?? "#8b6914", it.avatarColor2 ?? "#8b6914", it.avatarColor3 ?? "#8b6914"],
                    },
                    owner: "pack",
                    ownerId: 0,
                    stock: 1,
                  };
                  return (
                    <div key={it.id} className="relative flex flex-col items-center gap-2">
                      <div className="relative" style={{ transform: "scale(0.82)", transformOrigin: "top center" }}>
                        <CardPreview item={card} />
                        {claimed && (
                          <div className="absolute inset-0 bg-black/55 rounded-2xl flex items-center justify-center overflow-hidden">
                            <div className="absolute w-[200%] text-center py-1.5 bg-amber-500 text-[#1a1412] text-xs font-black tracking-widest uppercase" style={{ transform: "rotate(-25deg)" }}>
                              ĐÃ NHẬN
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={`text-[11px] font-bold truncate w-full text-center ${claimed ? "text-amber-100/30" : "text-amber-100/75"}`}>
                        {it.name}
                      </div>
                      <div className={`text-[10px] ${claimed ? "text-amber-100/20" : "text-amber-100/45"}`}>
                        OVR {it.rating} • {it.position}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* admin controls */}
          {isAdmin && (
            <div className="glass-panel p-5 space-y-4">
              <div className="text-sm font-extrabold text-amber-100/90 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-200/70" />
                Admin: Quản lý Pack
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs text-amber-100/50 font-bold">Chọn pack</div>
                  <Select value={adminSelectedPackId ? String(adminSelectedPackId) : ""} onValueChange={(v) => setAdminSelectedPackId(Number(v))}>
                    <SelectTrigger className="bg-[#2a1f1b] border-white/10 text-amber-50">
                      <SelectValue placeholder="Chọn pack..." />
                    </SelectTrigger>
                    <SelectContent>
                      {adminPacks.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.status === "active" ? "🟢" : p.status === "draft" ? "🟡" : "⚪"} {p.name} ({p.seasonKey}) · {p.items}/{p.poolSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-amber-100/50 font-bold">Tạo pack mới (draft)</div>
                  <div className="flex gap-2">
                    <Input value={newPackName} onChange={(e) => setNewPackName(e.target.value)} className="bg-[#2a1f1b] border-white/10 text-amber-50" placeholder="Tên pack" />
                    <Button onClick={adminCreatePack} disabled={adminSaving || !newPackName.trim()} className="rounded-xl bg-[#c6a96b] text-[#1a1412] font-black hover:bg-[#d4b86b]">
                      Tạo
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={newPackSeasonKey} onChange={(e) => setNewPackSeasonKey(e.target.value)} className="bg-[#2a1f1b] border-white/10 text-amber-50" placeholder="seasonKey" />
                    <Input value={String(newPackPoolSize)} onChange={(e) => setNewPackPoolSize(Number(e.target.value || 15))} className="bg-[#2a1f1b] border-white/10 text-amber-50" placeholder="poolSize" />
                    <Input value={String(newPackCost)} onChange={(e) => setNewPackCost(Number(e.target.value || 200))} className="bg-[#2a1f1b] border-white/10 text-amber-50" placeholder="cost" />
                  </div>
                </div>
              </div>

              {adminPackDetail?.pack && (
                <div className="space-y-3">
                  <Separator className="bg-white/10" />
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <div className="text-xs text-amber-100/50 font-bold mb-1">Tên pack</div>
                      <Input
                        defaultValue={adminPackDetail.pack.name}
                        onBlur={(e) => adminUpdatePack({ name: e.target.value })}
                        className="bg-[#2a1f1b] border-white/10 text-amber-50"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-amber-100/50 font-bold mb-1">Cost</div>
                      <Input
                        defaultValue={String(adminPackDetail.pack.cost)}
                        onBlur={(e) => adminUpdatePack({ cost: Number(e.target.value || 200) })}
                        className="bg-[#2a1f1b] border-white/10 text-amber-50"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-amber-100/50 font-bold mb-1">poolSize</div>
                      <Input
                        defaultValue={String(adminPackDetail.pack.poolSize)}
                        onBlur={(e) => adminUpdatePack({ poolSize: Number(e.target.value || 15) })}
                        className="bg-[#2a1f1b] border-white/10 text-amber-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => adminUpdatePack({ status: "active" })}
                      disabled={adminSaving}
                      className="rounded-xl bg-green-600 text-white font-black hover:bg-green-700"
                    >
                      Publish (Active)
                    </Button>
                    <Button
                      onClick={() => adminUpdatePack({ status: "draft" })}
                      disabled={adminSaving}
                      className="rounded-xl bg-[#2a1f1b] border border-white/10 text-amber-200/80 font-black hover:bg-[#3b2b23]"
                    >
                      Set Draft
                    </Button>
                    <Button
                      onClick={() => adminUpdatePack({ status: "archived" })}
                      disabled={adminSaving}
                      className="rounded-xl bg-[#2a1f1b] border border-white/10 text-amber-200/80 font-black hover:bg-[#3b2b23]"
                    >
                      Archive
                    </Button>
                  </div>

                  <div className="text-xs text-amber-100/50">
                    Items: <span className="text-amber-100/80 font-extrabold">{adminPackDetail.items.length}</span> / poolSize{" "}
                    <span className="text-amber-100/80 font-extrabold">{adminPackDetail.pack.poolSize}</span>
                    {adminPackDetail.items.length < adminPackDetail.pack.poolSize && (
                      <span className="ml-2 text-red-300/80 font-bold">Thiếu item (không publish được)</span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs text-amber-100/50 font-bold">Thêm cầu thủ từ template card</div>
                        <Input
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Search card name..."
                          className="bg-[#2a1f1b] border-white/10 text-amber-50"
                        />
                        <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#1f1714]">
                          {allCards
                            .filter((c) => !templateSearch || c.name.toLowerCase().includes(templateSearch.toLowerCase()))
                            .slice(0, 80)
                            .map((c) => {
                              const selected = templateCardId === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setTemplateCardId(c.id)}
                                  className={
                                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition " +
                                    (selected
                                      ? "bg-[#c6a96b]/20 text-amber-50"
                                      : "bg-transparent text-amber-100/80 hover:bg-white/5")
                                  }
                                >
                                  <span className="truncate">
                                    {c.name} · OVR {c.rating} · {c.position} · IMP {c.imp}
                                  </span>
                                  {selected && <span className="text-[10px] font-bold text-[#f2d97a] shrink-0">ĐÃ CHỌN</span>}
                                </button>
                              );
                            })}
                          {allCards.filter((c) => !templateSearch || c.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-[11px] text-amber-100/40">Không tìm thấy card phù hợp.</div>
                          )}
                        </div>
                        <Button
                          onClick={adminAddItemFromTemplate}
                          disabled={adminSaving || !templateCardId}
                          className="w-full rounded-xl bg-[#c6a96b] text-[#1a1412] font-black hover:bg-[#d4b86b]"
                        >
                          Add vào pack
                        </Button>
                      </div>

                      <Separator className="bg-white/10" />

                      <div className="space-y-2">
                        <div className="text-xs text-amber-100/50 font-bold">Hoặc tạo cầu thủ mới</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Tên cầu thủ"
                            className="bg-[#2a1f1b] border-white/10 text-amber-50 text-sm col-span-2"
                            maxLength={12}
                          />
                          <select
                            value={newItemPosition}
                            onChange={(e) => setNewItemPosition(e.target.value as Position)}
                            className="w-full bg-[#2a1f1b] border border-white/10 text-amber-50 rounded-lg px-3 py-2 h-9 text-sm"
                          >
                            {(["GK", "CB", "CM", "ST"] as Position[]).map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            value={newItemRating}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n)) setNewItemRating(Math.min(99, Math.max(40, n)));
                            }}
                            placeholder="OVR"
                            className="bg-[#2a1f1b] border-white/10 text-amber-50 text-sm"
                          />
                          <Input
                            type="number"
                            value={newItemImp}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (!Number.isNaN(n)) setNewItemImp(Math.min(99, Math.max(40, n)));
                            }}
                            placeholder="IMP"
                            className="bg-[#2a1f1b] border-white/10 text-amber-50 text-sm"
                          />
                        </div>
                        <Button
                          onClick={adminAddNewItem}
                          disabled={adminSaving || !newItemName.trim()}
                          className="w-full rounded-xl bg-[#c6a96b] text-[#1a1412] font-black hover:bg-[#d4b86b]"
                        >
                          Tạo cầu thủ
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-amber-100/50 font-bold">Danh sách cầu thủ trong pack</div>
                      <div className="max-h-[260px] overflow-auto space-y-2 pr-1">
                        {adminPackDetail.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-amber-100/85 truncate">{it.name}</div>
                              <div className="text-[10px] text-amber-100/45">OVR {it.rating} · {it.position} · IMP {it.imp}</div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => adminStartEditItem(it)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#c6a96b]/10 border border-[#c6a96b]/20 text-[#c6a96b]/90 text-[10px] font-black hover:bg-[#c6a96b]/20 transition"
                                disabled={adminSaving}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => adminRemoveItem(it.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300/90 text-[10px] font-black hover:bg-red-500/20 transition"
                                disabled={adminSaving}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {adminPackDetail.items.length === 0 && (
                          <div className="text-xs text-amber-100/35">Chưa có item nào.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Item Modal */}
          {editingItemId && adminPackDetail && (
            <div className="modal-overlay" onClick={() => setEditingItemId(null)} style={{ animation: "fadeIn 0.3s ease-out" }}>
              <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()} style={{ animation: "slideUp 0.4s ease-out" }}>
                {(() => {
                  const editingItem = adminPackDetail.items.find((it) => it.id === editingItemId);
                  if (!editingItem) return null;
                  const previewCard: CardItem = {
                    id: `fpitem-edit-${editingItem.id}`,
                    name: editItemName || editingItem.name,
                    nation: editingItem.nation,
                    position: editItemPosition,
                    rating: editItemRating || editingItem.rating,
                    atk: editItemAtk || editingItem.atk,
                    def: editItemDef || editingItem.def,
                    pas: editItemPas || editingItem.pas,
                    imp: editItemImp || editingItem.imp,
                    series: editingItem.series as any,
                    region: editingItem.region as any,
                    effect: editItemEffect || undefined,
                    avatarStyle: editItemAvatarStyle,
                    owner: "pack",
                    ownerId: 0,
                    stock: 1,
                  };
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-extrabold text-amber-100">Edit Pack Item</div>
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
                        >
                          <X className="w-4 h-4 text-amber-200/60" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div style={{ transform: "scale(0.9)", transformOrigin: "top center" }}>
                            <CardPreview item={previewCard} avatarText={editItemAvatarStyle.text} avatarStyleOverride={editItemAvatarStyle} />
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 w-full sm:flex-1">
                          <Card className="bg-[#2a1f1b] border-white/10">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Tuỳ chỉnh cầu thủ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Tên</label>
                                  <Input
                                    value={editItemName}
                                    onChange={(e) => setEditItemName(e.target.value)}
                                    placeholder="Enter name"
                                    className="bg-[#1f1714]/70 border-white/15 text-amber-50 h-9 text-sm"
                                    maxLength={12}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Chữ avatar</label>
                                  <Input
                                    value={editItemAvatarStyle.text ?? ""}
                                    onChange={(e) => setEditItemAvatarStyle({ ...editItemAvatarStyle, text: e.target.value.slice(0, 2) })}
                                    placeholder="AB"
                                    className="bg-[#1f1714]/70 border-white/15 text-amber-50 h-9 text-sm uppercase"
                                    maxLength={2}
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Vị trí</label>
                                  <select
                                    value={editItemPosition}
                                    onChange={(e) => setEditItemPosition(e.target.value as Position)}
                                    className="w-full bg-[#1f1714]/70 border border-white/15 text-amber-50 rounded-lg px-3 py-2 h-9 text-sm"
                                  >
                                    {(["GK", "CB", "CM", "ST"] as Position[]).map((p) => (
                                      <option key={p} value={p}>
                                        {p}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Màu</label>
                                <div className="flex justify-center gap-6 items-end">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <label
                                      className="w-12 h-12 rounded-xl border-2 border-white/20 cursor-pointer transition hover:scale-110 shadow-lg block overflow-hidden"
                                      style={{ background: editItemAvatarStyle.colors[0] }}
                                    >
                                      <input
                                        type="color"
                                        value={editItemAvatarStyle.colors[0]}
                                        onChange={(e) => {
                                          const c = e.target.value;
                                          setEditItemAvatarStyle({ ...editItemAvatarStyle, colorMode: 1, colors: [c, c, c] });
                                        }}
                                        className="opacity-0 w-0 h-0 absolute"
                                      />
                                    </label>
                                    <span className="text-[9px] text-amber-200/50 font-bold">Avatar</span>
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5">
                                    <label
                                      className="w-12 h-12 rounded-xl border-2 border-white/20 cursor-pointer transition hover:scale-110 shadow-lg flex items-center justify-center text-xs font-bold overflow-hidden"
                                      style={{ background: editItemAvatarStyle.textColor, color: editItemAvatarStyle.textColor.toLowerCase() === '#ffffff' ? '#000' : '#fff' }}
                                    >
                                      Aa
                                      <input
                                        type="color"
                                        value={editItemAvatarStyle.textColor}
                                        onChange={(e) => setEditItemAvatarStyle({ ...editItemAvatarStyle, textColor: e.target.value })}
                                        className="opacity-0 w-0 h-0 absolute"
                                      />
                                    </label>
                                    <span className="text-[9px] text-amber-200/50 font-bold">Chữ</span>
                                  </div>
                                </div>
                              </div>

                              <Separator className="bg-white/10" />
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {[
                                  { label: "OVR", val: editItemRating, set: setEditItemRating },
                                  { label: "ATK", val: editItemAtk, set: setEditItemAtk },
                                  { label: "DEF", val: editItemDef, set: setEditItemDef },
                                  { label: "PAS", val: editItemPas, set: setEditItemPas },
                                  { label: "IMP", val: editItemImp, set: setEditItemImp },
                                ].map((s) => (
                                  <div key={s.label} className="space-y-1">
                                    <label className="text-[10px] font-bold text-amber-200/70 text-center block">{s.label}</label>
                                    <Input
                                      type="number"
                                      value={s.val}
                                      onChange={(e) => {
                                        const n = Number(e.target.value);
                                        if (!Number.isNaN(n)) s.set(Math.min(99, Math.max(0, n)));
                                      }}
                                      className="bg-[#1f1714]/70 border-white/15 text-amber-50 text-center text-sm"
                                    />
                                  </div>
                                ))}
                              </div>
                              <Separator className="bg-white/10" />
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-amber-200/70 uppercase tracking-wider">Effect</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {EFFECTS.map((fx) => {
                                    const isChosen = editItemEffect === fx.value;
                                    return (
                                      <button
                                        key={fx.value}
                                        onClick={() => setEditItemEffect(fx.value)}
                                        className={
                                          "rounded-lg border px-3 py-2 text-left transition-all " +
                                          (isChosen
                                            ? "border-[#c6a96b]/60 bg-[#c6a96b]/15"
                                            : "border-white/10 bg-[#1f1714]/40 hover:bg-[#1f1714]/70")
                                        }
                                      >
                                        <div className={"text-xs font-bold " + (isChosen ? "text-amber-100" : "text-amber-200/60")}>
                                          {fx.label}
                                        </div>
                                        {fx.rarity !== "COMMON" && (
                                          <div className="text-[8px] font-black mt-0.5" style={{ color: RARITY_STYLE[fx.rarity].color, letterSpacing: '.1em' }}>
                                            {fx.rarity}
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  className="flex-1 rounded-lg bg-[#c6a96b] text-[#1a1412] font-bold hover:bg-[#d4b86b] h-9 text-sm"
                                  onClick={adminSaveEditItem}
                                  disabled={adminSaving}
                                >
                                  Lưu thay đổi
                                </Button>
                                <Button
                                  className="rounded-lg bg-[#2a1f1b] border border-white/10 text-amber-200/70 font-bold hover:bg-[#3b2b23] h-9 text-sm"
                                  onClick={() => setEditingItemId(null)}
                                >
                                  Huỷ
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ================= LOCKED TAB =================
function LockedTab({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f2d97a]/20 to-[#8b6914]/20 border border-[#c6a96b]/15 flex items-center justify-center">
        <Lock className="w-10 h-10 text-[#c6a96b]/50" />
      </div>
      <div className="text-center space-y-2">
        <div className="text-xl font-extrabold text-amber-100/80 tracking-wide">Yêu cầu đăng nhập</div>
        <div className="text-xs text-amber-100/35 max-w-sm leading-relaxed tracking-wide">
          Hãy đăng nhập để mở khóa tính năng này. Bạn cần tài khoản để quản lý đội hình và thẻ của mình.
        </div>
      </div>
      <Button
        onClick={onLogin}
        className="rounded-xl bg-gradient-to-r from-[#d4a843] to-[#f2d97a] text-[#1a1412] font-bold hover:opacity-90 transition px-8 shadow-lg shadow-[#d4a843]/20"
      >
        <Lock className="w-4 h-4 mr-2" />
        Đăng nhập ngay
      </Button>
    </div>
  );
}

// ================= HOW TO PLAY =================
function HowToPlayPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = [
    {
      num: 1,
      icon: <Lock className="w-5 h-5" />,
      title: "Đăng nhập",
      desc: "Đăng nhập bằng Discord để lưu dữ liệu, nhận thẻ và tích COIN.",
      accent: "#c6a96b",
    },
    {
      num: 2,
      icon: <Sparkles className="w-5 h-5" />,
      title: "Nhận thẻ cầu thủ",
      desc: "Admin phát thẻ ban đầu cho bạn. Mỗi thẻ có OVR (điểm tổng quát) càng cao thì càng mạnh.",
      accent: "#f2d97a",
    },
    {
      num: 3,
      icon: <Gem className="w-5 h-5" />,
      title: "Mở pack & nâng cấp",
      desc: "Dùng COIN mở pack cầu thủ ngẫu nhiên để nhận thẻ mới (chỉ số ngẫu nhiên). Bạn cũng có thể nâng cấp thẻ để tăng chỉ số.",
      accent: "#7dd3fc",
    },
    {
      num: 4,
      icon: <Star className="w-5 h-5" />,
      title: "Đập thẻ rủi ro",
      desc: "Dùng 5 thẻ hi sinh để đập 1 thẻ mục tiêu. Tỉ lệ thành công thấp, nhưng càng nhiều thẻ tier cao thì cơ hội càng lớn.",
      accent: "#fb7185",
    },
    {
      num: 5,
      icon: <ShoppingCart className="w-5 h-5" />,
      title: "Mua bán trên Market",
      desc: "Rao bán thẻ của bạn hoặc mua thẻ từ người khác. Market cũng là nguồn pool cho pack cầu thủ.",
      accent: "#10b981",
    },
    {
      num: 6,
      icon: <Trophy className="w-5 h-5" />,
      title: "Xếp Lineup & Thi đấu",
      desc: "Xếp đội hình 5 thẻ rồi vào mục Lineup Battle để đá mô phỏng, nhận ELO và COIN.",
      accent: "#f59e0b",
    },
  ];

  const faqs = [
    { q: "COIN kiếm ở đâu?", a: "Đá Haxball Elo và Lineup Battle: thắng +5 COIN, thua cũng được +2 COIN, hoà +1 COIN. Admin có thể thưởng thêm qua Event." },
    { q: "Mở pack cầu thủ ra thẻ kiểu gì?", a: "Pack cầu thủ sẽ mở ngẫu nhiên ra 1 cầu thủ với chỉ số ngẫu nhiên." },
    { q: "Giá bán trên Market bị giới hạn thế nào?", a: "Max theo tier: D 50 COIN, C 100 COIN, B 300 COIN, A 700 COIN, S 3000 COIN." },
    { q: "Đập thẻ có bị mất không?", a: "Bạn chọn 1 thẻ mục tiêu và 5 thẻ hi sinh. 5 thẻ hi sinh luôn bị xoá, thẻ mục tiêu chỉ tăng chỉ số – hên thì nhảy tier." },
    { q: "Thẻ mua từ người khác / pack có đập được không?", a: "Có. Tất cả thẻ thuộc sở hữu của bạn đều có thể dùng làm thẻ hi sinh hoặc thẻ mục tiêu." },
    { q: "Market có ảnh hưởng gì tới pack không?", a: "Có. Càng nhiều thẻ được người chơi list lên Market, pool pack cầu thủ càng đa dạng." },
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c6a96b]/15 border border-[#c6a96b]/25 mx-auto">
          <HelpCircle className="w-8 h-8 text-[#c6a96b]" />
        </div>
        <div>
          <div className="text-2xl font-extrabold">BẮT ĐẦU CHƠI STAR TEAM</div>
          <div className="text-sm text-amber-100/50 mt-1">Đọc 2 phút là hiểu hết — không phức tạp đâu!</div>
        </div>
      </div>

      {/* ===== STEP-BY-STEP ===== */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-amber-200/50 uppercase tracking-widest text-center">Hành trình người chơi</div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[23px] top-6 bottom-6 w-px bg-gradient-to-b from-[#c6a96b]/40 via-[#c6a96b]/20 to-transparent hidden sm:block" />
          <div className="space-y-3">
            {steps.map((s) => (
              <div key={s.num} className="flex gap-4 items-start">
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center relative z-10"
                  style={{ background: s.accent + "20", border: `1.5px solid ${s.accent}40`, color: s.accent }}
                >
                  {s.icon}
                </div>
                <div className="pt-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: s.accent + "20", color: s.accent }}>
                      BƯỚC {s.num}
                    </span>
                    <span className="text-sm font-extrabold text-amber-50">{s.title}</span>
                  </div>
                  <div className="text-sm text-amber-100/60 mt-1 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PACKS ===== */}
      <Card className="bg-[#2a1f1b] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gem className="w-5 h-5 text-[#7dd3fc]" />
            Pack & nâng cấp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-amber-100/50 mb-3">
            Mở pack cầu thủ để nhận thẻ mới (ngẫu nhiên chỉ số). Nâng cấp để tăng chỉ số cho thẻ sẵn có.
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-amber-100/70">
            <div className="rounded-xl px-3 py-3 text-center border border-white/15 bg-white/5">
              <div className="font-extrabold text-amber-100">Pack cầu thủ</div>
              <div className="mt-1">50 COIN</div>
              <div className="mt-1 text-amber-100/50">1 cầu thủ, chỉ số ngẫu nhiên</div>
            </div>
            <div className="rounded-xl px-3 py-3 text-center border border-white/15 bg-white/5">
              <div className="font-extrabold text-yellow-300">Pack nâng cấp</div>
              <div className="mt-1">100 COIN</div>
              <div className="mt-1 text-amber-100/50">Tăng chỉ số 1–2 dòng</div>
            </div>
            <div className="rounded-xl px-3 py-3 text-center border border-white/15 bg-white/5">
              <div className="font-extrabold text-rose-300">Tier-up</div>
              <div className="mt-1">5 thẻ hi sinh</div>
              <div className="mt-1 text-amber-100/50">Rủi ro, có thể nhảy tier</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== TIER UP ===== */}
      <Card className="bg-[#2a1f1b] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-5 h-5 text-[#fb7185]" />
            Cách đập thẻ lên Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="text-sm font-bold text-red-300">5 thẻ hi sinh</span>
            </div>
            <div className="text-lg text-amber-100/30">→</div>
            <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#c6a96b]/10 border border-[#c6a96b]/20">
              <span className="text-sm font-bold text-[#c6a96b]">1 thẻ được nâng tier</span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-amber-100/60">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#c6a96b]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#c6a96b]">1</span>
              </div>
              <span>Chọn <strong className="text-amber-100">1 thẻ mục tiêu</strong> muốn nâng tier</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#c6a96b]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#c6a96b]">2</span>
              </div>
              <span>Chọn <strong className="text-amber-100">5 thẻ bất kỳ</strong> làm nguyên liệu (sẽ bị thu hồi)</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#c6a96b]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#c6a96b]">3</span>
              </div>
              <span>Tỉ lệ cơ bản <strong className="text-[#f2d97a]">60%</strong>. Thẻ hi sinh tier cao → tỉ lệ tăng (tối đa 90%)</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#c6a96b]/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#c6a96b]">4</span>
              </div>
              <span>Thành công: thẻ mục tiêu <strong className="text-emerald-400">+5 tất cả chỉ số</strong>. Thất bại: thẻ mục tiêu không mất</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== HAXBALL ===== */}
      <Card className="bg-[#2a1f1b] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#f59e0b]" />
            Haxball — Rank ELO trong trận
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-amber-100/50">
            Liên kết tài khoản Haxball để vừa rank ELO trực tiếp trong trận, vừa nhận COIN tự động: thắng +5, thua +2, hoà +1.
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center">
              <div className="text-lg font-black text-emerald-400">+5</div>
              <div className="text-[10px] font-bold text-emerald-400/60">COIN khi thắng</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center">
              <div className="text-lg font-black text-amber-100/40">+2</div>
              <div className="text-[10px] font-bold text-amber-100/30">COIN khi thua</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center">
              <div className="text-lg font-black text-amber-100/40">+1</div>
              <div className="text-[10px] font-bold text-amber-100/30">COIN khi hoà</div>
            </div>
          </div>
          <div className="text-xs text-amber-100/40 leading-relaxed">
            Vào tab <strong className="text-amber-100/60">HAXBALL</strong> → Nhấn &quot;Liên kết Haxball&quot; → Copy lệnh <code className="px-1.5 py-0.5 rounded bg-black/30 text-[#f2d97a] text-[10px]">!login CODE</code> → Gõ trong room Haxball. ELO dùng hệ thống Elo chuẩn (bắt đầu 1000) và được cộng/trừ sau mỗi trận theo luật phía trên.
          </div>
        </CardContent>
      </Card>

      {/* ===== FAQ ===== */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-amber-200/50 uppercase tracking-widest text-center">Câu hỏi thường gặp</div>
        <div className="space-y-1.5">
          {faqs.map((f, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left rounded-xl border border-white/8 bg-[#2a1f1b] overflow-hidden transition-all"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-bold text-amber-100/80">{f.q}</span>
                <span className={"text-amber-100/30 transition-transform text-lg " + (openFaq === i ? "rotate-45" : "")}>+</span>
              </div>
              {openFaq === i && (
                <div className="px-4 pb-3 text-sm text-amber-100/55 leading-relaxed border-t border-white/5 pt-2">
                  {f.a}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= HAXBALL LOGIN PAGE =================
function HaxballPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<{
    haxAuth: string | null;
    haxName: string | null;
    elo: number;
    matches: { id: number; won: boolean; scoreWin: number; scoreLose: number; eloChange: number; date: string }[];
  } | null>(null);

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [linkStatus, setLinkStatus] = useState<"idle" | "waiting" | "confirmed" | "expired">("idle");
  const [starting, setStarting] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/api/hax/profile");
      if (res.error) {
        setError(res.error);
      } else {
        setProfile({
          haxAuth: res.haxAuth ?? null,
          haxName: res.haxName ?? null,
          elo: res.elo ?? 1000,
          matches: (res.matches ?? []).map((m: any) => ({
            ...m,
            date: m.date,
          })),
        });
      }
    } catch {
      setError("Không tải được dữ liệu Haxball");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const startLink = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await api("/api/hax/login/start", { method: "POST" });
      if (res.error) {
        setError(res.error);
        return;
      }
      const exp = new Date(res.expiresAt);
      setCode(res.code);
      setExpiresAt(exp);
      setLinkStatus("waiting");
      const secs = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
      setRemaining(secs);
    } catch {
      setError("Không tạo được code, thử lại sau");
    } finally {
      setStarting(false);
    }
  };

  // countdown
  useEffect(() => {
    if (!code || !expiresAt || linkStatus !== "waiting") return;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        setLinkStatus("expired");
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [code, expiresAt, linkStatus]);

  // poll confirm status
  useEffect(() => {
    if (!code || linkStatus !== "waiting") return;
    let stopped = false;
    const id = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await api(`/api/hax/login/status?code=${encodeURIComponent(code)}`);
        if (res.error) return;
        if (res.expired) {
          setLinkStatus("expired");
          clearInterval(id);
        } else if (res.confirmed) {
          setLinkStatus("confirmed");
          clearInterval(id);
          setTimeout(() => {
            setCode(null);
            setExpiresAt(null);
            setRemaining(0);
          }, 1500);
          loadProfile();
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [code, linkStatus, loadProfile]);

  const linked = !!profile?.haxAuth;

  const wins = profile?.matches?.filter((m) => m.won).length ?? 0;
  const losses = profile?.matches ? profile.matches.length - wins : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-[#15100e] border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#c6a96b]/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#c6a96b]" />
            </span>
            Haxball Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-amber-100/60">
            {linked
              ? `Đã liên kết với Haxball: ${profile?.haxName || profile?.haxAuth || "Unknown"}`
              : "Liên kết tài khoản Haxball để nhận ELO và Coin khi đá trận."}
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <Button
            onClick={startLink}
            disabled={starting || loading}
            className="w-full h-11 rounded-xl bg-[#d4b86b] text-[#1a1412] font-bold text-sm hover:bg-[#e2c87a] flex items-center justify-center gap-2"
          >
            {starting
              ? "Đang tạo code..."
              : linked
              ? "Liên kết lại Haxball"
              : "Liên kết Haxball"}
          </Button>
          {code && (
            <div className="mt-3 rounded-xl border border-[#c6a96b]/40 bg-[#1f1714]/80 p-4 space-y-3">
              <div className="text-xs font-bold text-amber-100/60 uppercase tracking-wider">
                Lệnh login Haxball
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/40 border border-white/10 font-mono text-[11px] text-[#f2d97a]">
                  !login {code}
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(`!login ${code}`)}
                    className="p-0.5 rounded hover:bg-white/10 transition"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-amber-100/60">
                  Hết hạn sau{" "}
                  <span className="font-bold text-[#f2d97a]">
                    {remaining}s
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#15100e] border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#c6a96b]/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#c6a96b]" />
            </span>
            ELO & Thống kê
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#1c1512] border border-white/5 px-4 py-3 text-center">
              <div className="text-xs text-amber-100/50 mb-1">ELO</div>
              <div className="text-2xl font-extrabold text-[#f2d97a]">
                {profile?.elo ?? 1000}
              </div>
            </div>
            <div className="rounded-2xl bg-[#1c1512] border border-white/5 px-4 py-3 text-center">
              <div className="text-xs text-amber-100/50 mb-1">Thắng</div>
              <div className="text-xl font-extrabold text-emerald-400">
                {wins}
              </div>
            </div>
            <div className="rounded-2xl bg-[#1c1512] border border-white/5 px-4 py-3 text-center">
              <div className="text-xs text-amber-100/50 mb-1">Thua</div>
              <div className="text-xl font-extrabold text-red-400">
                {losses}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ================= NOTIFICATION DROPDOWN =================
type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
};

function NotificationDropdown({ 
  show, 
  onClose, 
  onMarkRead, 
  onRefresh 
}: { 
  show: boolean; 
  onClose: () => void; 
  onMarkRead: () => void;
  onRefresh: () => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadNotifications();
    }
  }, [show]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api<{ notifications: NotificationItem[] }>("/api/notifications");
      setNotifications(res.notifications || []);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id?: number) => {
    try {
      await api("/api/notifications", {
        method: "POST",
        body: JSON.stringify(id ? { notificationId: id } : { markAllRead: true }),
      });
      onMarkRead();
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark read:", e);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24" onClick={onClose}>
      <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-200/10">
            <div className="text-lg font-extrabold text-amber-100">THÔNG BÁO</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMarkRead()}
                className="text-xs text-amber-200/60 hover:text-amber-200/80 font-bold"
              >
                Đánh dấu tất cả
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
                <X className="w-4 h-4 text-amber-200/60" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-amber-100/60 text-sm">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-amber-100/60 text-sm">Không có thông báo</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`glass-panel p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all ${
                    !n.read ? "border border-amber-400/30 bg-amber-400/5" : ""
                  }`}
                  onClick={() => {
                    if (!n.read) handleMarkRead(n.id);
                    // Nếu có link trong data, điều hướng tới đó
                    if (n.data && typeof n.data === 'object' && 'link' in n.data) {
                      window.location.href = (n.data as any).link;
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-amber-100 mb-1">{n.title}</div>
                      <div className="text-xs text-amber-200/70">{n.message}</div>
                      <div className="text-[10px] text-amber-200/40 mt-1">
                        {new Date(n.createdAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= ADMIN DASHBOARD =================
type AdminUserSummary = {
  id: number;
  username: string;
  discordName: string | null;
  role: string;
  balance: number | "";
  cardCount: number;
};

function AdminDashboard() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [adminPage, setAdminPage] = useState(1);
  const [adminSearch, setAdminSearch] = useState("");
  const ADMIN_PER_PAGE = 30;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api("/api/admin/users");
        if (res.error) {
          setError(res.error);
        } else if (Array.isArray(res)) {
          setUsers(
            res.map((u: any) => ({
              id: u.id,
              username: u.username,
              discordName: u.discordName ?? null,
              role: u.role,
              balance: u.balance,
              cardCount: u.cardCount ?? 0,
            }))
          );
        }
      } catch {
        setError("Không tải được danh sách user");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDeleteUser = async (id: number, username: string) => {
    if (!window.confirm(`Xoá toàn bộ user "${username}" và mọi dữ liệu liên quan?`)) return;
    setDeletingId(id);
    try {
      const res = await api(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.error) {
        alert(res.error);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert("Xoá user thất bại, thử lại sau");
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangeBalance = (id: number, value: string) => {
    if (value === "") {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, balance: "" } : u)));
      return;
    }
    const n = Number(value);
    if (Number.isNaN(n)) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, balance: n } : u)));
  };

  const handleSaveBalance = async (u: AdminUserSummary) => {
    setSavingId(u.id);
    try {
      const res = await api(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ balance: u.balance === "" ? 0 : u.balance }),
      });
      if (res.error) {
        alert(res.error);
      }
    } catch {
      alert("Lưu COIN thất bại, thử lại sau");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-amber-100/60">Đang tải danh sách user...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-extrabold flex items-center gap-2">
          ADMIN / USER MANAGEMENT
        </div>
        <div className="text-xs text-amber-100/50 mt-0.5">
          Xoá user sẽ xoá toàn bộ thẻ, lineup và lịch sử nâng cấp liên quan.
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-100/30" />
          <Input
            type="text"
            placeholder="🔍 Tìm theo tên, ID..."
            value={adminSearch}
            onChange={e => { setAdminSearch(e.target.value); setAdminPage(1); }}
            className="bg-[#1f1714]/70 border border-white/15 text-amber-50 rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-amber-100/30 focus:border-[#c6a96b]/40 transition"
          />
        </div>
        <div className="text-[10px] text-amber-100/40">{users.length} users</div>
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden bg-[#1d1613] overflow-x-auto">
        <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[11px] font-bold text-amber-100/60 border-b border-white/10 min-w-[500px]">
          <div>ID</div>
          <div>Username</div>
          <div>Role</div>
          <div>Cards</div>
          <div>COIN</div>
          <div className="text-right">Actions</div>
        </div>
        {(() => {
          const filtered = users.filter(u => {
            if (!adminSearch) return true;
            const q = adminSearch.toLowerCase();
            return (
              u.username.toLowerCase().includes(q) ||
              (u.discordName?.toLowerCase().includes(q)) ||
              String(u.id).includes(q)
            );
          });
          const totalAdminPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PER_PAGE));
          const clampedAdminPage = Math.min(adminPage, totalAdminPages);
          const paginatedUsers = filtered.slice((clampedAdminPage - 1) * ADMIN_PER_PAGE, clampedAdminPage * ADMIN_PER_PAGE);
          return (<>{paginatedUsers.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-6 gap-2 px-4 py-2 text-xs items-center border-b border-white/5 last:border-b-0 min-w-[500px]"
          >
            <div className="text-amber-100/70">#{u.id}</div>
            <div>
              <div className="font-semibold">{u.discordName ?? u.username}</div>
              {u.discordName && u.discordName !== u.username && (
                <div className="text-[10px] text-amber-100/40">{u.username}</div>
              )}
            </div>
            <div className="text-amber-100/60">{u.role}</div>
            <div className="text-amber-100/70">{u.cardCount}</div>
            <div>
              <div className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-[#c6a96b]" />
                <Input
                  type="number"
                  value={u.balance === "" ? "" : String(u.balance)}
                  onChange={(e) => handleChangeBalance(u.id, e.target.value)}
                  className="h-7 bg-[#251b17] border-white/15 text-amber-50 text-xs px-2 py-1"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSaveBalance(u)}
                disabled={savingId === u.id}
                className="mt-1 text-[10px] text-amber-200/70 hover:text-amber-200 disabled:opacity-60"
              >
                {savingId === u.id ? "Đang lưu..." : "Lưu COIN"}
              </button>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-3 text-[11px]"
                onClick={() => handleDeleteUser(u.id, u.username)}
                disabled={deletingId === u.id}
              >
                {deletingId === u.id ? "Đang xoá..." : "Xoá user"}
              </Button>
            </div>
          </div>
        ))}
        {totalAdminPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3">
            <button
              onClick={() => setAdminPage(p => Math.max(1, p - 1))}
              disabled={clampedAdminPage <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-[#2a1f1b] text-amber-200/70 hover:bg-[#3b2b23] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ←
            </button>
            {Array.from({ length: totalAdminPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setAdminPage(p)}
                className={
                  "w-8 h-8 rounded-lg text-xs font-bold border transition " +
                  (p === clampedAdminPage
                    ? "bg-[#c6a96b] text-[#1a1412] border-[#c6a96b]"
                    : "bg-[#2a1f1b] text-amber-200/70 border-white/10 hover:bg-[#3b2b23]")
                }
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setAdminPage(p => Math.min(totalAdminPages, p + 1))}
              disabled={clampedAdminPage >= totalAdminPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-[#2a1f1b] text-amber-200/70 hover:bg-[#3b2b23] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              →
            </button>
            <span className="text-[10px] text-amber-100/40 ml-2">{filtered.length} kết quả</span>
          </div>
        )}
        </>);
        })()}
      </div>
    </div>
  );
}

// ================= ROOT =================
export default function StarPlayerWebsiteUI() {
  const [tab, setTab] = useState("market");
  const [t, setT] = useState(2615);
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false });
  const [allCards, setAllCards] = useState<CardItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);

  const isAdmin = auth.loggedIn && auth.role === "admin";
  const username = auth.loggedIn ? auth.username : "";
  const userId = auth.loggedIn ? auth.userId : 0;

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    const cards = await api("/api/cards");
    if (Array.isArray(cards)) {
      setAllCards(cards.map((c: Record<string, unknown>) => dbCardToFrontend(c, userId)));
    }
    setCardsLoading(false);
  }, [userId]);

  const refreshAll = useCallback(async () => {
    await loadCards();
    if (auth.loggedIn) {
      const me = await api("/api/auth/me");
      if (me.loggedIn) setBalance(me.balance);
    }
  }, [loadCards, auth.loggedIn]);

  useEffect(() => {
    (async () => {
      const me = await api("/api/auth/me");
      if (me.loggedIn) {
        setAuth({ loggedIn: true, username: me.username, role: me.role as "admin" | "user", userId: me.id });
        setBalance(me.balance);
        setTab("my");
      }
      setAuthLoading(false);
    })();
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  useEffect(() => {
    const id = setInterval(() => setT((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const myCards = allCards.filter((c) => c.ownerId === userId);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!auth.loggedIn) return;
    try {
      const res = await api<{ unreadCount: number }>("/api/notifications?unreadOnly=true");
      setUnreadNotifications(res.unreadCount || 0);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }, [auth.loggedIn]);

  useEffect(() => {
    if (auth.loggedIn) {
      loadNotifications();
      // Chỉ refresh notification mỗi 60 giây để giảm tải server
      const interval = setInterval(loadNotifications, 60000); // Refresh every 60s
      return () => clearInterval(interval);
    }
  }, [auth.loggedIn, loadNotifications]);

  const handleLogin = (data: { id: number; username: string; role: "admin" | "user"; balance: number }) => {
    setAuth({ loggedIn: true, username: data.username, role: data.role as "admin" | "user", userId: data.id });
    setBalance(data.balance);
    setTab("my");
    loadCards();
  };

  const handleLogout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setAuth({ loggedIn: false });
    setBalance(0);
    setTab("market");
    loadCards();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0d0b] text-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f2d97a] to-[#8b6914] flex items-center justify-center shadow-lg shadow-[#d4a843]/20 animate-pulse">
            <Star className="w-6 h-6 text-[#1a1412]" fill="#1a1412" />
          </div>
          <div className="text-amber-200/40 text-xs tracking-widest uppercase">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0d0b] text-amber-50 relative overflow-x-hidden">
      <StyleFx />
      <div className="star-bg" />

      <div className="relative z-10 p-3 sm:p-6">

      <div className="star-header text-center space-y-5">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f2d97a] to-[#8b6914] flex items-center justify-center shadow-lg shadow-[#d4a843]/20">
              <Star className="w-5 h-5 text-[#1a1412]" fill="#1a1412" />
            </div>
            <div className="star-logo">STAR TEAM</div>
          </div>
          {auth.loggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-300/80 text-xs font-bold hover:bg-red-500/15 hover:text-red-300 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              {username}
            </button>
          ) : tab !== "login" && (
            <button
              onClick={() => setTab("login")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c6a96b]/10 border border-[#c6a96b]/20 text-[#c6a96b] text-xs font-bold hover:bg-[#c6a96b]/20 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              Đăng nhập
            </button>
          )}
        </div>
        {tab !== "login" && (
          <>
            <PillNav tab={tab} setTab={setTab} isAdmin={isAdmin} />
            <div className="flex items-center justify-center gap-4">
              <div className="text-xs text-amber-200/40 tracking-wide">Ratings update in {formatHMS(t)}</div>
              {auth.loggedIn && (
                <>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative glass-nav rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-all"
                  >
                    <Bell className="w-4 h-4 text-amber-200/70" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </span>
                    )}
                  </button>
                <div className="coin-badge">
                  <Coins className="w-3.5 h-3.5 text-[#f2d97a]" />
                  <span className="text-sm font-bold text-[#f2d97a]">{balance}</span>
                  <span className="text-[10px] font-bold text-amber-200/40 tracking-wider">COIN</span>
                </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-8 max-w-5xl mx-auto">
        {tab === "login" && <LoginPage onLogin={handleLogin} />}

        {tab === "my" && (auth.loggedIn
          ? <MyCardPage allCards={allCards} setAllCards={setAllCards} isAdmin={isAdmin} username={username} userId={userId} onRefresh={refreshAll} cardsLoading={cardsLoading} />
          : <LockedTab onLogin={() => setTab("login")} />
        )}
        {tab === "collection" && (auth.loggedIn
          ? <CollectionPage myCards={myCards} cardsLoading={cardsLoading} />
          : <LockedTab onLogin={() => setTab("login")} />
        )}
        {tab === "gallery" && <GalleryPage />}
        {tab === "lineup" && (auth.loggedIn
          ? <HomePage myCards={myCards} userId={userId} onRefresh={refreshAll} />
          : <LockedTab onLogin={() => setTab("login")} />
        )}
        {tab === "market" && <MarketPage allCards={allCards} balance={balance} loggedIn={auth.loggedIn} isAdmin={isAdmin} userId={userId} onLogin={() => setTab("login")} onRefresh={refreshAll} />}
        {tab === "topup" && (
          <div className="space-y-6">
            <div>
              <div className="text-xl font-extrabold">NẠP THẺ / NẠP COIN</div>
              <div className="text-xs text-amber-200/60 mt-1">
                Quét mã QR để chuyển khoản nạp COIN. Sau khi bạn chuyển, admin sẽ cộng COIN thủ công vào tài khoản.
              </div>
            </div>
            <div className="glass-panel p-4 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-56 h-56 rounded-2xl bg-[#1d1512] border border-amber-200/30 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/qr-nap-tien.png"
                  alt="QR nạp COIN"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 space-y-3 text-xs text-amber-100/70">
                <div>
                  <div className="font-bold text-sm mb-1">Hướng dẫn</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Quét mã QR bằng app ngân hàng (hoặc chuyển khoản tay nếu không quét được).</li>
                    <li>Nội dung chuyển khoản: ghi rõ &quot;STAR - [tên ingame]&quot;.</li>
                    <li>Nếu bạn <span className="font-semibold text-amber-100">không có tài khoản ngân hàng</span>, hãy nạp thẻ qua <span className="font-semibold text-amber-100">ticket Discord của giải</span> (liên hệ BTC, gửi ảnh thẻ và mệnh giá).</li>
                    <li>Sau khi thanh toán xong, inbox admin/ticket gửi ảnh xác nhận để được cộng COIN.</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="font-bold text-sm mb-1">Tỉ lệ nạp (ví dụ)</div>
                  <div>10.000 VND = 100 COIN</div>
                  <div>50.000 VND = 550 COIN (bonus)</div>
                  <div>100.000 VND = 1200 COIN (bonus)</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === "upgrade" && <UpgradePage balance={balance} loggedIn={auth.loggedIn} userId={userId} onLogin={() => setTab("login")} onRefresh={refreshAll} allCards={allCards} />}
        {tab === "hax" && (auth.loggedIn ? <HaxballPage /> : <LockedTab onLogin={() => setTab("login")} />)}
        {tab === "battlepass" && (auth.loggedIn
          ? <BattlePassPage userId={userId} onRefresh={refreshAll} />
          : <LockedTab onLogin={() => setTab("login")} />
        )}
        {tab === "rank" && <RankPage currentUserId={userId} />}
        {tab === "how" && <HowToPlayPage />}
        {tab === "admin" && isAdmin && <AdminDashboard />}
      </div>

      <NotificationDropdown
        show={showNotifications}
        onClose={() => setShowNotifications(false)}
        onMarkRead={loadNotifications}
        onRefresh={loadNotifications}
      />

      </div>{/* end relative z-10 */}

      {/* Dải top nạp chạy ngang dưới trang (mock data) */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-r from-[#2b2018] via-[#3a2b1f] to-[#2b2018] border-t border-amber-200/25 shadow-[0_-4px_18px_rgba(0,0,0,0.6)]">
          <div className="max-w-5xl mx-auto overflow-hidden">
            <div className="w-max topup-marquee px-4 py-2 text-[12px] sm:text-[13px] text-amber-50 whitespace-nowrap tracking-wide">
              <span className="font-extrabold text-[#f2d97a] mr-8 drop-shadow-[0_0_6px_rgba(242,217,122,0.7)]">
                ⭐ TOP NẠP THÁNG ⭐
              </span>
              <span className="mr-12 font-semibold text-[#fceec0]">1. shi - 350.000đ</span>
              <span className="mr-12 font-semibold text-[#f7e08a]">2. lee - 30.000đ</span>
              <span className="mr-12 font-semibold text-[#f2d97a]">3. kg - 10.000đ</span>
              {/* lặp lại để tạo hiệu ứng chạy liên tục */}
              <span className="mr-12 font-semibold text-[#fceec0]">1. shi - 350.000đ</span>
              <span className="mr-12 font-semibold text-[#f7e08a]">2. lee - 30.000đ</span>
              <span className="mr-12 font-semibold text-[#f2d97a]">3. kg - 10.000đ</span>

              <span className="mr-12 font-semibold text-[#fceec0]">1. shi - 350.000đ</span>
              <span className="mr-12 font-semibold text-[#f7e08a]">2. lee - 30.000đ</span>
              <span className="mr-12 font-semibold text-[#f2d97a]">3. kg - 10.000đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}