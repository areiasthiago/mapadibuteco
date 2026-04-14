import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import type { Buteco } from "@/data/butecos";
import { useEffect, useState } from "react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const defaultIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background: #e8521a;
    border: 3px solid white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 12px rgba(0,0,0,0.35);
    font-size: 11px;
    color: white;
    cursor: pointer;
    transition: transform 0.15s ease;
  ">🍺</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const selectedIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background: #e8521a;
    border: 3px solid #fff;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 4px rgba(232,82,26,0.3), 0 4px 16px rgba(0,0,0,0.4);
    font-size: 14px;
    color: white;
    cursor: pointer;
  ">🍺</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

const userIcon = L.divIcon({
  className: "user-marker",
  html: `<div style="
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    box-shadow: 0 0 0 6px rgba(59,130,246,0.25), 0 3px 12px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ userLocation, cityCenter, cityZoom }: {
  userLocation: [number, number] | null;
  cityCenter: [number, number];
  cityZoom: number;
}) {
  const map = useMap();
  const [hasFittedUser, setHasFittedUser] = useState(false);

  useEffect(() => {
    if (userLocation && !hasFittedUser) {
      map.flyTo(userLocation, 14, { duration: 1.2 });
      setHasFittedUser(true);
    }
  }, [userLocation, hasFittedUser, map]);

  useEffect(() => {
    map.flyTo(cityCenter, cityZoom, { duration: 1.2 });
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
  cityCenter: [number, number];
  cityZoom: number;
}

export default function ButecoMap({ butecos, selectedButeco, onSelectButeco, userLocation, cityCenter, cityZoom }: ButecoMapProps) {
  return (
    <MapContainer
      center={userLocation || cityCenter}
      zoom={userLocation ? 14 : cityZoom}
      style={{ width: "100%", height: "100%", minHeight: 400 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds userLocation={userLocation} cityCenter={cityCenter} cityZoom={cityZoom} />
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
        />
      ))}
    </MapContainer>
  );
}
