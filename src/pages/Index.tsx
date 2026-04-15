import { useState, useMemo, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import ButecoMap from "@/components/ButecoMap";
import ButecoCard from "@/components/ButecoCard";
import CircuitPanel from "@/components/CircuitPanel";
import { butecos, cities } from "@/data/butecos";
import type { Buteco } from "@/data/butecos";
import { Search, X, ChevronDown, List, MapPin, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import L from "leaflet";

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
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedButeco, setSelectedButeco] = useState<Buteco | null>(null);
  const [search, setSearch] = useState("");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoFailed, setGeoFailed] = useState(false);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const isMobile = useIsMobile();

  const cityConfig = selectedCity ? cities.find((c) => c.value === selectedCity) ?? null : null;

  useEffect(() => {
    if (!("geolocation" in navigator)) { setGeoFailed(true); return; }
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
          () => setGeoFailed(true),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

  const filtered = useMemo(() => {
    const result = butecos.filter((b) => {
      if (!mapBounds) return false;
      if (!mapBounds.contains([b.lat, b.lng])) return false;
      return !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
        b.dish.toLowerCase().includes(search.toLowerCase());
    });
    if (userLocation) {
      result.sort((a, b) => {
        const distA = getDistanceKm(userLocation[0], userLocation[1], a.lat, a.lng);
        const distB = getDistanceKm(userLocation[0], userLocation[1], b.lat, b.lng);
        return distA - distB;
      });
    }
    return result;
  }, [search, userLocation, mapBounds]);

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
    <span style={{ fontSize: 12, color: "rgba(196,61,15,0.75)" }}>
      {filtered.length} butecos no seu mapa{userLocation && " · por distância"}
    </span>
  );

  const searchBar = (
    <div style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        <input
          placeholder="Buscar buteco, bairro ou prato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 8px 8px 34px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", fontSize: 14, color: "var(--foreground)", outline: "none" }}
        />
      </div>
    </div>
  );

  const butecoList = (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {filtered.map((buteco) => (
        <ButecoCard key={buteco.id} buteco={buteco} isSelected={selectedButeco?.id === buteco.id} onClick={() => handleSelectButeco(buteco)} distance={distanceLabel(buteco)} />
      ))}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)", fontSize: 14 }}>
          <p>Nenhum buteco visível nessa área</p>
        </div>
      )}
    </div>
  );

  const listPanel = (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(232,82,26,0.25)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <List size={14} color="rgb(196,61,15)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgb(196,61,15)" }}>Butecos</span>
            <span style={{ background: "#e8521a", color: "#fff", borderRadius: "999px", padding: "0 7px", height: 18, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 18 }}>{filtered.length}</span>
          </div>
          {statusLine}
        </div>
      </div>
      {searchBar}
      {butecoList}
    </div>
  );

  const mapOverlay = geoFailed && !selectedCity ? (
    <div style={{ position: "absolute", inset: 0, zIndex: 1000, background: "rgba(26,18,8,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, backdropFilter: "blur(4px)" }}>
      <MapPin size={40} color="#e8521a" />
      <p style={{ color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center", maxWidth: 260 }}>Selecione uma cidade para explorar os butecos</p>
      <select
        onChange={(e) => setSelectedCity(e.target.value)}
        defaultValue=""
        style={{ background: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "var(--foreground)", minWidth: 200 }}
      >
        <option value="" disabled>Escolha a cidade...</option>
        {cities.map((c) => (
          <option key={c.value} value={c.value}>{c.label} - {c.state}</option>
        ))}
      </select>
    </div>
  ) : null;

  const mapComponent = (
    <ButecoMap
      butecos={filtered}
      selectedButeco={selectedButeco}
      onSelectButeco={handleSelectButeco}
      userLocation={userLocation}
      cityCenter={cityConfig?.center ?? null}
      cityZoom={cityConfig?.zoom ?? 12}
      onBoundsChange={handleBoundsChange}
    />
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
        <Header selectedCity={selectedCity} onCityChange={setSelectedCity} butecoCount={filtered.length} geoActive={!!userLocation} />
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {mapComponent}
          {mapOverlay}
          {selectedButeco && !mapOverlay && (
            <div style={{ position: "absolute", bottom: 80, left: 12, right: 12, zIndex: 1000 }}>
              <CircuitPanel anchor={selectedButeco} allButecos={butecos} onClose={() => setSelectedButeco(null)} onSelectButeco={handleSelectButeco} />
            </div>
          )}
          {!mapOverlay && (
            <button
              onClick={() => { setSelectedButeco(null); setMobileListOpen(true); }}
              style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "var(--primary)", color: "#fff", border: "none", borderRadius: 999, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(232,82,26,0.4)" }}
            >
              <SlidersHorizontal size={20} />
              Busca e Filtros
            </button>
          )}
        </div>

        {mobileListOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setMobileListOpen(false)}>
            <div style={{ background: "var(--card)", borderRadius: "20px 20px 0 0", height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "16px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>Busca e Filtros</h2>
                <button onClick={() => setMobileListOpen(false)} style={{ background: "var(--primary)", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 999, display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 13, fontWeight: 600 }}>
                  <X size={14} color="#fff" /> Fechar e aplicar
                </button>
              </div>
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
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
      <Header selectedCity={selectedCity} onCityChange={setSelectedCity} butecoCount={filtered.length} geoActive={!!userLocation} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <aside style={{ width: 380, flexShrink: 0, background: "var(--background)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {listPanel}
        </aside>
        <main style={{ flex: 1, position: "relative" }}>
          {mapComponent}
          {mapOverlay}
          {selectedButeco && !mapOverlay && (
            <div style={{ position: "absolute", bottom: 16, left: 16, width: 400, zIndex: 1000 }}>
              <CircuitPanel anchor={selectedButeco} allButecos={butecos} onClose={() => setSelectedButeco(null)} onSelectButeco={handleSelectButeco} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
