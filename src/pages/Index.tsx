import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import ButecoMap from "@/components/ButecoMap";
import ButecoCard from "@/components/ButecoCard";
import CircuitPanel from "@/components/CircuitPanel";
import { butecos, cities } from "@/data/butecos";
import type { Buteco, City } from "@/data/butecos";
import { TAG_MAP, TAG_CATEGORIES } from "@/lib/tags";
import { Search, SlidersHorizontal, X, ChevronDown, List } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ALL_TAGS = Object.keys(TAG_MAP);

// Toggle switch component
function TagToggle({ tag, enabled, onToggle }: { tag: string; enabled: boolean; onToggle: () => void }) {
  const t = TAG_MAP[tag];
  if (!t) return null;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 0", borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: enabled ? "var(--foreground)" : "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16 }}>{t.emoji}</span> {t.label}
      </span>
      <button
        onClick={onToggle}
        style={{
          width: 40, height: 22, borderRadius: 999,
          background: enabled ? "var(--primary)" : "var(--border)",
          border: "none", cursor: "pointer",
          position: "relative", transition: "background 0.2s ease", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: enabled ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City>("Rio de Janeiro");
  const [selectedButeco, setSelectedButeco] = useState<Buteco | null>(null);
  const [search, setSearch] = useState("");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [disabledTags, setDisabledTags] = useState<Set<string>>(new Set());
  const [openPanel, setOpenPanel] = useState<"lista" | "filtros">("lista");
  const isMobile = useIsMobile();

  const cityConfig = cities.find((c) => c.value === selectedCity)!;
  const hasActiveFilters = disabledTags.size > 0;

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const applyLocation = (lat: number, lng: number) => {
      const loc: [number, number] = [lat, lng];
      setUserLocation(loc);
      const closest = cities.reduce((prev, curr) => {
        const distPrev = getDistanceKm(loc[0], loc[1], prev.center[0], prev.center[1]);
        const distCurr = getDistanceKm(loc[0], loc[1], curr.center[0], curr.center[1]);
        return distCurr < distPrev ? curr : prev;
      });
      setSelectedCity(closest.value);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => applyLocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => applyLocation(pos.coords.latitude, pos.coords.longitude),
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const cityButecos = useMemo(() => butecos.filter((b) => b.city === selectedCity), [selectedCity]);

  const filtered = useMemo(() => {
    const result = cityButecos.filter((b) => {
      // Filtro de busca
      const matchSearch = !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
        b.dish.toLowerCase().includes(search.toLowerCase());

      // Filtro de tags: se há filtros ativos, some botecos sem tags ou com tags desligadas
      let matchTags = true;
      if (disabledTags.size > 0) {
        if (!b.tags || b.tags.length === 0) {
          matchTags = false;
        } else {
          matchTags = !b.tags.some((tag) => disabledTags.has(tag));
        }
      }

      return matchSearch && matchTags;
    });

    if (userLocation) {
      result.sort((a, b) => {
        const distA = getDistanceKm(userLocation[0], userLocation[1], a.lat, a.lng);
        const distB = getDistanceKm(userLocation[0], userLocation[1], b.lat, b.lng);
        return distA - distB;
      });
    }
    return result;
  }, [search, disabledTags, userLocation, cityButecos]);

  const toggleTag = (tag: string) => {
    setDisabledTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleCityChange = (city: City) => {
    setSelectedCity(city);
    setSelectedButeco(null);
    setSearch("");
  };

  const handleSelectButeco = (buteco: Buteco) => {
    setSelectedButeco(buteco);
    if (isMobile) setMobileListOpen(false);
  };

  const distanceLabel = (buteco: Buteco) => {
    if (!userLocation) return null;
    const d = getDistanceKm(userLocation[0], userLocation[1], buteco.lat, buteco.lng);
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  };

  const statusLine = (
    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
      {filtered.length} butecos
      {userLocation && " · por distância"}
      {hasActiveFilters && ` · ${disabledTags.size} filtro${disabledTags.size > 1 ? "s" : ""} ativo${disabledTags.size > 1 ? "s" : ""}`}
    </span>
  );

  const searchBar = (
    <div style={{ padding: "12px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        <input
          placeholder="Buscar buteco, bairro ou prato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "8px 8px 8px 34px", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--muted)",
            fontSize: 14, color: "var(--foreground)", outline: "none",
          }}
        />
      </div>
    </div>
  );

  const butecoList = (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {filtered.map((buteco) => (
        <ButecoCard
          key={buteco.id}
          buteco={buteco}
          isSelected={selectedButeco?.id === buteco.id}
          onClick={() => handleSelectButeco(buteco)}
          distance={distanceLabel(buteco)}
        />
      ))}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)", fontSize: 14 }}>
          <p>Nenhum buteco encontrado</p>
          {hasActiveFilters && (
            <button onClick={() => setDisabledTags(new Set())} style={{ marginTop: 8, color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Fechado: laranja suave (0.06) + laranja. Aberto: laranja mais forte (0.12) + preto 75%
  const panelBg = (panel: "filtros" | "lista") =>
    openPanel === panel ? "rgba(232,82,26,0.06)" : "rgba(232,82,26,0.12)";
  const panelColor = (panel: "filtros" | "lista") =>
    openPanel === panel ? "var(--primary)" : "rgba(26,18,8,0.75)";

  const filterPanel = (
    <div>
      <button
        onClick={() => setOpenPanel(openPanel === "filtros" ? "lista" : "filtros")}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: panelBg("filtros"),
          border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
          transition: "background 0.2s ease",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SlidersHorizontal size={14} color={panelColor("filtros")} />
            <span style={{ fontSize: 13, fontWeight: 700, color: panelColor("filtros") }}>Filtros</span>
            {hasActiveFilters && (
              <span style={{
                background: "var(--primary)", color: "#fff",
                borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{disabledTags.size}</span>
            )}
          </div>
          {statusLine}
        </div>
        <ChevronDown size={16} color={panelColor("filtros")} style={{
          transform: openPanel === "filtros" ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease", flexShrink: 0,
        }} />
      </button>
      {openPanel === "filtros" && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          {hasActiveFilters && (
            <button
              onClick={() => setDisabledTags(new Set())}
              style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", marginBottom: 8, padding: 0 }}
            >
              Limpar todos os filtros
            </button>
          )}
          {TAG_CATEGORIES.map((cat) => (
            <div key={cat.label} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                {cat.label}
              </p>
              {cat.tags.map((tag) => (
                <TagToggle key={tag} tag={tag} enabled={!disabledTags.has(tag)} onToggle={() => toggleTag(tag)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const listPanel = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <button
        onClick={() => setOpenPanel(openPanel === "lista" ? "filtros" : "lista")}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: panelBg("lista"),
          border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
          transition: "background 0.2s ease", flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} color={panelColor("lista")} />
            <span style={{ fontSize: 13, fontWeight: 700, color: panelColor("lista") }}>
              Butecos ({filtered.length})
            </span>
          </div>
          {statusLine}
        </div>
        <ChevronDown size={16} color={panelColor("lista")} style={{
          transform: openPanel === "lista" ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease", flexShrink: 0,
        }} />
      </button>
      {openPanel === "lista" && (
        <>
          {searchBar}
          {butecoList}
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
        <Header selectedCity={selectedCity} onCityChange={handleCityChange} butecoCount={cityButecos.length} />
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <ButecoMap
            butecos={filtered}
            selectedButeco={selectedButeco}
            onSelectButeco={handleSelectButeco}
            userLocation={userLocation}
            cityCenter={cityConfig.center}
            cityZoom={cityConfig.zoom}
          />
          {selectedButeco && (
            <div style={{ position: "absolute", bottom: 80, left: 12, right: 12, zIndex: 1000 }}>
              <CircuitPanel
                anchor={selectedButeco}
                allButecos={cityButecos}
                onClose={() => setSelectedButeco(null)}
                onSelectButeco={handleSelectButeco}
              />
            </div>
          )}
          <button
            onClick={() => { setSelectedButeco(null); setMobileListOpen(true); }}
            style={{
              position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
              zIndex: 1000, background: hasActiveFilters ? "#c43d0f" : "var(--primary)", color: "#fff",
              border: "none", borderRadius: 999, padding: "12px 20px",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(232,82,26,0.4)",
            }}
          >
            <SlidersHorizontal size={20} />
            Busca e Filtros
            {hasActiveFilters && (
              <span style={{ background: "#fff", color: "#c43d0f", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {disabledTags.size}
              </span>
            )}
          </button>
        </div>

        {mobileListOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }} onClick={() => setMobileListOpen(false)}>
            <div
              style={{
                background: "var(--card)", borderRadius: "20px 20px 0 0",
                height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "16px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>Busca e Filtros</h2>
                <button
                  onClick={() => setMobileListOpen(false)}
                  style={{
                    background: "var(--primary)", border: "none", cursor: "pointer",
                    padding: "6px 12px", borderRadius: 999,
                    display: "flex", alignItems: "center", gap: 6,
                    color: "#fff", fontSize: 13, fontWeight: 600,
                  }}
                >
                  <X size={14} color="#fff" /> Fechar e aplicar
                </button>
              </div>
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
                {filterPanel}
                {listPanel}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <Header selectedCity={selectedCity} onCityChange={handleCityChange} butecoCount={cityButecos.length} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{
          width: 380, flexShrink: 0,
          background: "var(--background)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
            {filterPanel}
            {listPanel}
          </div>
        </aside>
        <main style={{ flex: 1, position: "relative" }}>
          <ButecoMap
            butecos={filtered}
            selectedButeco={selectedButeco}
            onSelectButeco={handleSelectButeco}
            userLocation={userLocation}
            cityCenter={cityConfig.center}
            cityZoom={cityConfig.zoom}
          />
          {selectedButeco && (
            <div style={{ position: "absolute", bottom: 16, left: 16, width: 400, zIndex: 1000 }}>
              <CircuitPanel
                anchor={selectedButeco}
                allButecos={cityButecos}
                onClose={() => setSelectedButeco(null)}
                onSelectButeco={handleSelectButeco}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
