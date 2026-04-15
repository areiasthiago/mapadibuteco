import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { Buteco } from "@/data/butecos";
import { useEffect, useRef } from "react";
import { TAG_MAP } from "@/lib/tags";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const defaultIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#e8521a;border:3px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.35);font-size:11px;color:white;cursor:pointer;transition:transform 0.15s ease;">🍺</div>`,
  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
});

const selectedIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#e8521a;border:3px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(232,82,26,0.3),0 4px 16px rgba(0,0,0,0.4);font-size:14px;color:white;cursor:pointer;">🍺</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20],
});

const userIcon = L.divIcon({
  className: "user-marker",
  html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 3px 12px rgba(0,0,0,0.35);"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

// Componente que emite bounds quando o mapa move/zoom
function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });
  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);
  return null;
}

function FlyTo({ userLocation, cityCenter, cityZoom }: {
  userLocation: [number, number] | null;
  cityCenter: [number, number] | null;
  cityZoom: number;
}) {
  const map = useMap();
  const fittedToUser = useRef(false);
  const prevCityCenter = useRef(cityCenter);

  useEffect(() => {
    if (userLocation && !fittedToUser.current) {
      fittedToUser.current = true;
      map.flyTo(userLocation, 14, { duration: 1.2 });
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (!cityCenter) return;
    const prev = prevCityCenter.current;
    const changed = !prev || prev[0] !== cityCenter[0] || prev[1] !== cityCenter[1];
    if (changed) {
      prevCityCenter.current = cityCenter;
      if (!fittedToUser.current) {
        map.flyTo(cityCenter, cityZoom, { duration: 1.2 });
      }
    }
  }, [cityCenter, cityZoom, map]);

  return null;
}

function MapFlyTo({ buteco }: { buteco: Buteco | null }) {
  const map = useMap();
  useEffect(() => {
    if (buteco) map.flyTo([buteco.lat, buteco.lng], 15, { duration: 1 });
  }, [buteco, map]);
  return null;
}

interface ButecoMapProps {
  butecos: Buteco[];
  selectedButeco: Buteco | null;
  onSelectButeco: (buteco: Buteco) => void;
  userLocation: [number, number] | null;
  cityCenter: [number, number] | null;
  cityZoom: number;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}

export default function ButecoMap({ butecos, selectedButeco, onSelectButeco, userLocation, cityCenter, cityZoom, onBoundsChange }: ButecoMapProps) {
  const initialCenter: [number, number] = cityCenter || [-22.9068, -43.1729];

  return (
    <MapContainer
      center={initialCenter}
      zoom={cityZoom}
      style={{ width: "100%", height: "100%", minHeight: 400 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      <FlyTo userLocation={userLocation} cityCenter={cityCenter} cityZoom={cityZoom} />
      <MapFlyTo buteco={selectedButeco} />

      {userLocation && (
        <>
          <Marker position={userLocation} icon={userIcon}>
            <Popup><div style={{ textAlign: "center", padding: "4px 8px", fontWeight: 600 }}>📍 Você está aqui</div></Popup>
          </Marker>
          <Circle center={userLocation} radius={200} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 1 }} />
        </>
      )}

      {butecos.map((buteco) => (
        <Marker
          key={buteco.id}
          position={[buteco.lat, buteco.lng]}
          icon={selectedButeco?.id === buteco.id ? selectedIcon : defaultIcon}
          eventHandlers={{ click: () => onSelectButeco(buteco) }}
        >
          {buteco.tags && buteco.tags.length > 0 && (
            <Tooltip direction="top" offset={[0, -16]} opacity={1} className="buteco-tag-tooltip">
              <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "2px 0" }}>
                {buteco.tags.map((tag) => {
                  const t = TAG_MAP[tag];
                  if (!t) return null;
                  return (
                    <span key={tag} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#1a1208" }}>
                      <span style={{ fontSize: 14 }}>{t.emoji}</span> {t.label}
                    </span>
                  );
                })}
              </div>
            </Tooltip>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
