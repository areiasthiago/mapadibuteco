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
            <h1 className="font-extrabold text-xl leading-none tracking-tight">Mapa di Buteco</h1>
            <p className="text-xs opacity-80">{butecoCount} visíveis · <span className="opacity-70">v{version} beta</span></p>
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
