import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import ButecoMap from "@/components/ButecoMap";
import ButecoCard from "@/components/ButecoCard";
import CircuitPanel from "@/components/CircuitPanel";
import { butecos, cities } from "@/data/butecos";
import type { Buteco, City } from "@/data/butecos";
import { Search, Filter, List, X } from "lucide-react";
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

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City>("Rio de Janeiro");
  const [selectedButeco, setSelectedButeco] = useState<Buteco | null>(null);
  const [search, setSearch] = useState("");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const isMobile = useIsMobile();

  const cityConfig = cities.find((c) => c.value === selectedCity)!;

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const cityButecos = useMemo(() => butecos.filter((b) => b.city === selectedCity), [selectedCity]);

  const filtered = useMemo(() => {
    const result = cityButecos.filter((b) =>
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      b.dish.toLowerCase().includes(search.toLowerCase())
    );
    if (userLocation) {
      result.sort((a, b) => {
        const distA = getDistanceKm(userLocation[0], userLocation[1], a.lat, a.lng);
        const distB = getDistanceKm(userLocation[0], userLocation[1], b.lat, b.lng);
        return distA - distB;
      });
    }
    return result;
  }, [search, userLocation, cityButecos]);

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

  const searchBar = (
    <div style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        <input
          placeholder="Buscar buteco, bairro ou prato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 8px 8px 34px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--muted)",
            fontSize: 14,
            color: "var(--foreground)",
            outline: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, color: "var(--muted-foreground)" }}>
        <Filter size={13} />
        <span style={{ fontSize: 12 }}>
          {filtered.length} butecos encontrados
          {userLocation && " · ordenados por distância"}
        </span>
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
          Nenhum buteco encontrado
        </div>
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
              zIndex: 1000, background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: 999, padding: "12px 20px",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(232,82,26,0.4)",
            }}
          >
            <List size={20} /> Ver lista ({filtered.length})
          </button>
        </div>

        {/* Mobile sheet */}
        {mobileListOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }} onClick={() => setMobileListOpen(false)}>
            <div
              style={{
                background: "var(--card)", borderRadius: "20px 20px 0 0",
                height: "75vh", display: "flex", flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>Butecos Participantes</h2>
                <button onClick={() => setMobileListOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <X size={20} color="var(--muted-foreground)" />
                </button>
              </div>
              {searchBar}
              {butecoList}
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
          {searchBar}
          {butecoList}
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
            <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, maxWidth: 420, zIndex: 1000 }}>
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
