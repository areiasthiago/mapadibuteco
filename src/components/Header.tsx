import { Beer } from "lucide-react";
import { cities } from "@/data/butecos";
import type { City } from "@/data/butecos";

const version = __APP_VERSION__;

interface HeaderProps {
  selectedCity: City | null;
  onCityChange: (city: City) => void;
  butecoCount: number;
  geoActive: boolean;
}

export default function Header({ selectedCity, onCityChange, butecoCount, geoActive }: HeaderProps) {
  return (
    <header style={{ background: "var(--primary)", color: "var(--primary-foreground)", padding: "14px 24px" }} className="shadow-lg">
      <div className="flex items-center justify-between gap-3 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Beer size={28} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 className="font-extrabold text-xl leading-none tracking-tight">Mapa di Buteco</h1>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px",
                borderRadius: 6, background: "rgba(255,255,255,0.2)",
                color: "#fff", letterSpacing: "0.04em", lineHeight: 1.4,
              }}>v{version} beta</span>
            </div>
            <p className="text-xs opacity-70 mt-0.5">{butecoCount} no seu mapa</p>
          </div>
        </div>
        {/* Select só aparece quando geo falhou */}
        {!geoActive && (
          <select
            value={selectedCity ?? ""}
            onChange={(e) => onCityChange(e.target.value as City)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <option value="" disabled style={{ background: "var(--primary)" }}>Cidade...</option>
            {cities.map((c) => (
              <option key={c.value} value={c.value} style={{ background: "var(--primary)", color: "#fff" }}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
}
