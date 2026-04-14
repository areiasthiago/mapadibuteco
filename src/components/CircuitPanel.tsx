import { useState } from "react";
import type { Buteco } from "@/data/butecos";
import { TAG_MAP } from "@/lib/tags";
import { Route, Clock, X, ChevronRight, ChevronDown, UtensilsCrossed, MapPin } from "lucide-react";

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function StopCard({ buteco, index, isOpen, onToggle }: { buteco: Buteco; index: number; isOpen: boolean; onToggle: () => void }) {
  const isAnchor = index === 0;
  return (
    <div style={{
      borderRadius: 10,
      background: isAnchor ? "rgba(232,82,26,0.05)" : "transparent",
      border: isAnchor ? "1px solid rgba(232,82,26,0.2)" : "1px solid transparent",
    }}>
      <button
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: isAnchor ? "var(--primary)" : "var(--muted)",
          color: isAnchor ? "#fff" : "var(--foreground)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, flexShrink: 0
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: isAnchor ? 700 : 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buteco.name}</p>
          <p style={{ fontSize: 12, color: isAnchor ? "var(--primary)" : "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buteco.dish}</p>
        </div>
        {isOpen ? <ChevronDown size={16} color="var(--muted-foreground)" /> : <ChevronRight size={16} color="var(--muted-foreground)" />}
      </button>

      {isOpen && (
        <div style={{ padding: "0 8px 12px 8px" }}>
          {buteco.image && (
            <img src={buteco.image} alt={buteco.name} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
          )}
          <div style={{ paddingLeft: 38, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)" }}>
              <MapPin size={14} />
              <span style={{ fontSize: 12 }}>{buteco.address}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <UtensilsCrossed size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{buteco.dish}</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{buteco.dishDescription}</p>
              </div>
            </div>
            {buteco.tags && buteco.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {buteco.tags.map((tag) => {
                  const t = TAG_MAP[tag];
                  if (!t) return null;
                  return (
                    <span key={tag} style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 999,
                      background: "rgba(232,82,26,0.12)",
                      border: "1.5px solid rgba(232,82,26,0.35)",
                      fontSize: 12, fontWeight: 700,
                      color: "#c43d0f",
                    }}>
                      {t.emoji} {t.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CircuitPanelProps {
  anchor: Buteco;
  allButecos: Buteco[];
  onClose: () => void;
  onSelectButeco: (buteco: Buteco) => void;
}

export default function CircuitPanel({ anchor, allButecos, onClose }: CircuitPanelProps) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const MAX_CIRCUIT_KM = 5;

  const nearby = (() => {
    const sorted = allButecos
      .filter((b) => b.id !== anchor.id)
      .map((b) => ({ buteco: b, dist: getDistanceKm(anchor.lat, anchor.lng, b.lat, b.lng) }))
      .sort((a, b) => a.dist - b.dist);

    const result = [];
    let accumulated = 0;
    for (const item of sorted) {
      if (accumulated + item.dist > MAX_CIRCUIT_KM) break;
      accumulated += item.dist;
      result.push(item);
      if (result.length >= 4) break;
    }
    return result;
  })();

  const totalDist = nearby.reduce((sum, n) => sum + n.dist, 0);
  const estimatedTime = Math.round(nearby.length * 40 + (totalDist / 4) * 60);

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      overflow: "hidden",
      maxHeight: "60vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{ background: "rgba(232,82,26,0.08)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Route size={20} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>Circuito Sugerido</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
              {nearby.length + 1} paradas · ~{formatDist(totalDist)} · <Clock size={11} /> ~{estimatedTime}min
            </p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
          <X size={18} color="var(--muted-foreground)" />
        </button>
      </div>

      <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
        <StopCard buteco={anchor} index={0} isOpen={openIndex === 0} onToggle={() => setOpenIndex(openIndex === 0 ? -1 : 0)} />
        {nearby.map((n, i) => (
          <div key={n.buteco.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
              <div style={{ width: 1, height: 16, background: "var(--border)", marginLeft: 12 }} />
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{formatDist(n.dist)}</span>
            </div>
            <StopCard buteco={n.buteco} index={i + 1} isOpen={openIndex === i + 1} onToggle={() => setOpenIndex(openIndex === i + 1 ? -1 : i + 1)} />
          </div>
        ))}
      </div>
    </div>
  );
}
