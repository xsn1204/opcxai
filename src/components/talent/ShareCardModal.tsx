"use client";

import { useEffect, useRef, useState } from "react";
import { parseEnterpriseBio, ENTERPRISE_INFRA, ENTERPRISE_BUSINESS_TAGS, ENTERPRISE_SPECIALTIES, CAPABILITY_MODULES } from "@/types";

interface ShareCardProps {
  id: string;
  username: string;
  specialty?: string;
  bio?: string;
  avgScore: number;
  collabCount: number;
  capMods: string[];
  moduleLabels: Record<string, string>;
  toolStack: string[];
  onClose: () => void;
}

export function ShareCardModal({
  id, username, specialty, bio, avgScore, collabCount, capMods, moduleLabels, toolStack, onClose,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const enterpriseBio = parseEnterpriseBio(bio);
  const isEnterprise = !!enterpriseBio;
  const infraLabels = Object.fromEntries(ENTERPRISE_INFRA.map((i) => [i.id, `${i.icon} ${i.label}`]));
  const bizTagLabels = Object.fromEntries(ENTERPRISE_BUSINESS_TAGS.map((t) => [t.value, t.label]));
  const specialtyLabels = Object.fromEntries(ENTERPRISE_SPECIALTIES.map((s) => [s.value, `${s.icon} ${s.label}`]));
  const capModLabels = Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, `${m.icon} ${m.label}`]));
  const displayName = isEnterprise ? (enterpriseBio.enterprise_name || username) : username;
  const teamSizeMap: Record<string, string> = { solo: "独立操盘", "2-5": "2–5 人团队", "6-20": "6–20 人团队", "21-100": "21–100 人团队" };
  const teamSizeLabel = teamSizeMap[enterpriseBio?.team_size ?? ""] ?? "专业交付机构";

  const theme = isEnterprise ? {
    cardBg: "linear-gradient(160deg, #0f0a00 0%, #1f1500 40%, #3d2a00 75%, #5c4000 100%)",
    cardBorder: "rgba(212,160,23,0.35)",
    glowPrimary: "radial-gradient(circle, rgba(212,160,23,0.18) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)",
    accentText: "#f59e0b",
    accentTextLight: "#fde68a",
    accentMuted: "rgba(253,230,138,0.7)",
    bioBorder: "rgba(212,160,23,0.35)",
    bioText: "rgba(253,230,138,0.85)",
    statsBorder: "rgba(212,160,23,0.15)",
    divider: "rgba(212,160,23,0.15)",
    certBadgeBorder: "rgba(212,160,23,0.3)",
    certBadgeText: "#fde68a",
    qrDark: "#f59e0b",
    qrLight: "#0f0a00",
    tagSecondaryBg: "rgba(255,255,255,0.06)",
    tagSecondaryBorder: "rgba(251,191,36,0.15)",
    tagSecondaryText: "#fde68a",
    brandAccent: "#f59e0b",
    qrCaption: "rgba(253,230,138,0.6)",
  } : {
    cardBg: "linear-gradient(160deg, #0f0720 0%, #1a0a3d 40%, #2d1060 75%, #4c1d95 100%)",
    cardBorder: "rgba(139,92,246,0.35)",
    glowPrimary: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
    glowSecondary: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)",
    accentText: "#a78bfa",
    accentTextLight: "#c4b5fd",
    accentMuted: "rgba(196,181,253,0.7)",
    bioBorder: "rgba(139,92,246,0.35)",
    bioText: "rgba(221,214,254,0.85)",
    statsBorder: "rgba(139,92,246,0.15)",
    divider: "rgba(139,92,246,0.15)",
    certBadgeBorder: "rgba(139,92,246,0.3)",
    certBadgeText: "#c4b5fd",
    qrDark: "#c4b5fd",
    qrLight: "#062030",
    tagSecondaryBg: "rgba(255,255,255,0.06)",
    tagSecondaryBorder: "rgba(167,139,250,0.15)",
    tagSecondaryText: "#c4b5fd",
    brandAccent: "#a78bfa",
    qrCaption: "rgba(196,181,253,0.6)",
  };

  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/t/${id}` : `https://OPC x AI/t/${id}`;

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(profileUrl, { width: 120, margin: 1, color: { dark: theme.qrDark, light: theme.qrLight } })
        .then((url) => { if (!cancelled) setQrDataUrl(url); });
    });
    return () => { cancelled = true; };
  }, [profileUrl, isEnterprise]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const domtoimage = (await import("dom-to-image-more")).default;
      const dataUrl = await domtoimage.toPng(cardRef.current, { scale: 2 });
      const link = document.createElement("a");
      link.download = `opc-${displayName}.png`;
      link.href = dataUrl;
      link.click();
    } finally { setSaving(false); }
  }

  const score = avgScore ?? 0;
  const starFull = Math.round(score);
  const bioText = isEnterprise
    ? (enterpriseBio.past_cases ?? "").slice(0, 44) + ((enterpriseBio.past_cases?.length ?? 0) > 44 ? "…" : "")
    : bio ? bio.slice(0, 44) + (bio.length > 44 ? "…" : "") : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex flex-col items-center gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between w-full max-w-xs px-1">
          <span className="text-slate-400 text-sm">分享名片</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>

        <div ref={cardRef} style={{
          width: 320, borderRadius: 24, padding: 26, position: "relative", overflow: "hidden",
          fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif",
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          outline: "none", boxSizing: "border-box",
        }}>
          <div style={{ position: "absolute", top: -80, left: -80, width: 220, height: 220, borderRadius: "50%", background: theme.glowPrimary, pointerEvents: "none", border: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 180, height: 180, borderRadius: "50%", background: theme.glowSecondary, pointerEvents: "none", border: "none" }} />

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18, border: "none", outline: "none" }}>

<span
  style={{
    color: "#f0f9ff",
    fontWeight: 900,
    fontSize: 15,
    lineHeight: "19px",
    letterSpacing: -0.5,
    border: "none",
        fontStyle: "italic",
  }}
>
  OPC
</span>

<span
  style={{
    color: theme.brandAccent,
    fontWeight: 900,
    fontSize: 15,
    lineHeight: "19px",
    border: "none",
    whiteSpace: "nowrap",
    fontStyle: "italic",
    marginLeft: "6px"
  }}
>
  x AI
</span>
            <span style={{ marginLeft: 8, fontSize: 9, lineHeight: "13px", color: theme.certBadgeText, border: `1px solid ${theme.certBadgeBorder}`, borderRadius: 99, padding: "2px 7px", whiteSpace: "nowrap" }}>
              {isEnterprise ? "机构 OPC 认证" : "个人 OPC 认证"}
            </span>
          </div>

          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, border: "none", outline: "none" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: isEnterprise ? "linear-gradient(to top right, #f59e0b, #fb923c)" : "linear-gradient(to top right, #6366f1, #a855f7)",
              boxShadow: isEnterprise ? "0 10px 15px -3px rgba(251,191,36,0.3)" : "0 10px 15px -3px rgba(99,102,241,0.3)",
              textAlign: "center", lineHeight: "64px",
              color: "#ffffff", fontWeight: 900, fontSize: 20,
              border: "none", outline: "none",
            }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1, border: "none", outline: "none" }}>
              <div style={{ color: "#f0f9ff", fontWeight: 700, fontSize: 18, lineHeight: "22px", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", border: "none" }}>{displayName}</div>
              <div style={{ color: theme.accentTextLight, fontSize: 11, lineHeight: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", border: "none" }}>
                {isEnterprise ? teamSizeLabel : specialty}
              </div>
            </div>
          </div>

          {/* Bio / past cases */}
          {bioText && (
            <div style={{ color: theme.bioText, fontSize: 10, lineHeight: "17px", marginBottom: 14, paddingLeft: 10, borderLeft: `2px solid ${theme.bioBorder}`, borderTop: "none", borderRight: "none", borderBottom: "none", outline: "none" }}>
              {bioText}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, border: "none", outline: "none" }}>
            <div style={{ flex: 1, borderRadius: 12, padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,0.07)", border: `1px solid ${theme.statsBorder}`, outline: "none" }}>
              <div style={{ color: "#fbbf24", fontSize: 18, fontWeight: 700, lineHeight: "22px", border: "none", whiteSpace: "nowrap" }}>{score > 0 ? score.toFixed(1) : "—"}</div>
              <div style={{ color: theme.accentMuted, fontSize: 9, marginTop: 4, lineHeight: "13px", border: "none", whiteSpace: "nowrap" }}>综合评分</div>
              {score > 0 && <div style={{ color: "rgba(251,191,36,0.55)", fontSize: 9, marginTop: 2, lineHeight: "13px", border: "none", whiteSpace: "nowrap" }}>{"★".repeat(starFull)}{"☆".repeat(5 - starFull)}</div>}
            </div>
            <div style={{ flex: 1, borderRadius: 12, padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,0.07)", border: `1px solid ${theme.statsBorder}`, outline: "none" }}>
              <div style={{ color: theme.accentText, fontSize: 18, fontWeight: 700, lineHeight: "22px", border: "none", whiteSpace: "nowrap" }}>{collabCount}</div>
              <div style={{ color: theme.accentMuted, fontSize: 9, marginTop: 4, lineHeight: "13px", border: "none", whiteSpace: "nowrap" }}>合作次数</div>
            </div>
          </div>

          {/* Tags */}
          {isEnterprise ? (
            <>
              {(enterpriseBio.specialties ?? []).length > 0 && (
                <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 5, border: "none", outline: "none" }}>
                  {(enterpriseBio.specialties ?? []).slice(0, 4).map((id) => (
                    <span key={id} style={{ display: "inline-block", background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 99, padding: "3px 9px", fontSize: 10, lineHeight: "14px", whiteSpace: "nowrap" }}>
                      {specialtyLabels[id] ?? id}
                    </span>
                  ))}
                </div>
              )}
              {(enterpriseBio.infra ?? []).length > 0 && (
                <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 5, border: "none", outline: "none" }}>
                  {(enterpriseBio.infra ?? []).slice(0, 4).map((id) => (
                    <span key={id} style={{ display: "inline-block", background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 99, padding: "3px 9px", fontSize: 10, lineHeight: "14px", whiteSpace: "nowrap" }}>
                      {infraLabels[id] ?? id}
                    </span>
                  ))}
                </div>
              )}
              {(enterpriseBio.business_tags ?? []).length > 0 && (
                <div style={{ marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 5, border: "none", outline: "none" }}>
                  {(enterpriseBio.business_tags ?? []).slice(0, 4).map((id) => (
                    <span key={id} style={{ display: "inline-block", background: theme.tagSecondaryBg, color: theme.tagSecondaryText, border: `1px solid ${theme.tagSecondaryBorder}`, borderRadius: 6, padding: "2px 7px", fontSize: 9, lineHeight: "13px", whiteSpace: "nowrap" }}>
                      {bizTagLabels[id] ?? id}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {capMods.length > 0 && (
                <div style={{ marginBottom: toolStack.length > 0 ? 8 : 14, display: "flex", flexWrap: "wrap", gap: 5, border: "none", outline: "none" }}>
                  {capMods.map((mod) => (
                    <span key={mod} style={{ display: "inline-block", background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 99, padding: "3px 9px", fontSize: 10, lineHeight: "14px", whiteSpace: "nowrap" }}>
                      {capModLabels[mod] ?? mod}
                    </span>
                  ))}
                </div>
              )}
              {toolStack.length > 0 && (
                <div style={{ marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 5, border: "none", outline: "none" }}>
                  {toolStack.slice(0, 6).map((tool) => (
                    <span key={tool} style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 6, padding: "2px 7px", fontSize: 9, lineHeight: "13px", whiteSpace: "nowrap" }}>
                      {tool}
                    </span>
                  ))}
                  {toolStack.length > 6 && <span style={{ display: "inline-block", color: "rgba(167,139,250,0.4)", fontSize: 9, lineHeight: "13px", border: "none", whiteSpace: "nowrap" }}>+{toolStack.length - 6}</span>}
                </div>
              )}
            </>
          )}

          <div style={{ borderTop: `1px solid ${theme.divider}`, borderLeft: "none", borderRight: "none", borderBottom: "none", marginBottom: 14 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "none", outline: "none" }}>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR" style={{ width: 52, height: 52, borderRadius: 8, border: "none" }} />
              : <div style={{ width: 52, height: 52, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "none" }} />}
            <div style={{ textAlign: "right", border: "none", outline: "none" }}>
              <div
  style={{
    fontWeight: 700,
    fontSize: 13,
    lineHeight: "18px",
    border: "none",
    whiteSpace: "nowrap",
    fontStyle: "italic"
  }}
>
  <span style={{ color: "#f0f9ff", border: "none" }}>OPC</span>
  <span style={{ color: theme.brandAccent, border: "none" }}> x AI</span>
</div>
              <div style={{ color: theme.qrCaption, fontSize: 9, marginTop: 3, lineHeight: "13px", border: "none", whiteSpace: "nowrap" }}>扫码查看完整主页</div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className={`w-full max-w-xs py-3 rounded-2xl disabled:opacity-50 text-white text-sm font-semibold transition-colors ${isEnterprise ? "bg-amber-500 hover:bg-amber-400" : "bg-violet-600 hover:bg-violet-500"}`}>
          {saving ? "生成中…" : "保存图片"}
        </button>
      </div>
    </div>
  );
}
