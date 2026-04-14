import type { Buteco } from "@/data/butecos";
import { MapPin, UtensilsCrossed } from "lucide-react";

interface ButecoCardProps {
  buteco: Buteco;
  isSelected: boolean;
  onClick: () => void;
  distance?: string | null;
}

export default function ButecoCard({ buteco, isSelected, onClick, distance }: ButecoCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px",
        borderRadius: "12px",
        border: isSelected ? "2px solid var(--primary)" : "2px solid transparent",
        background: isSelected ? "rgba(232,82,26,0.06)" : "var(--card)",
        boxShadow: isSelected ? "0 2px 12px rgba(232,82,26,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "block",
      }}
    >
      <div style={{ display: "flex", gap: "12px" }}>
        {buteco.image ? (
          <img
            src={buteco.image}
            alt={buteco.name}
            style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 8,
            background: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <UtensilsCrossed size={24} color="var(--muted-foreground)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {buteco.name}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: "var(--muted-foreground)" }}>
            <MapPin size={12} />
            <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {buteco.neighborhood || "Rio de Janeiro"}
            </span>
            {distance && (
              <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, marginLeft: "auto", flexShrink: 0 }}>
                {distance}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {buteco.dish}
          </p>
        </div>
      </div>
    </button>
  );
}
