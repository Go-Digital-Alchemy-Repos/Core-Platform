import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" fill="none">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#1e3a5f"/>
  <circle cx="14" cy="14" r="7" fill="white"/>
  <circle cx="14" cy="14" r="4" fill="#2d8a7e"/>
</svg>`;

const pinIcon = L.divIcon({
  html: pinSvg,
  className: "",
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

interface EventLocationMapProps {
  latitude: string;
  longitude: string;
  locationName?: string;
}

export function EventLocationMap({ latitude, longitude, locationName }: EventLocationMapProps) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <div className="aspect-video max-h-[300px] rounded-xl overflow-hidden border" data-testid="map-event-location">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <Marker position={[lat, lng]} icon={pinIcon}>
          {locationName && (
            <Popup>
              <span className="text-sm font-medium">{locationName}</span>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
