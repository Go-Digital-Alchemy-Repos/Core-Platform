import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "wouter";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { User } from "@shared/schema/users";

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

interface TherapistWithUser {
  profile: TherapistProfile;
  user: Pick<User, "firstName" | "lastName">;
}

interface MapViewProps {
  therapists: TherapistWithUser[];
  height?: string;
  interactive?: boolean;
  zoom?: number;
}

export function MapView({ therapists, height = "500px", interactive = true, zoom: zoomProp }: MapViewProps) {
  const markered = useMemo(
    () =>
      therapists.filter(
        (t) => t.profile.latitude != null && t.profile.longitude != null
      ),
    [therapists]
  );

  const center = useMemo<[number, number]>(() => {
    if (markered.length === 0) return [20, 0];
    const avgLat =
      markered.reduce((sum, t) => sum + Number(t.profile.latitude), 0) /
      markered.length;
    const avgLng =
      markered.reduce((sum, t) => sum + Number(t.profile.longitude), 0) /
      markered.length;
    return [avgLat, avgLng];
  }, [markered]);

  const zoom = zoomProp ?? (markered.length === 0 ? 2 : markered.length === 1 ? 6 : 3);

  const tileUrl = interactive
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div style={{ height }} className="rounded-md overflow-hidden border" data-testid="map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />
        {markered.map((t) => {
          const fullName =
            [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") ||
            "Therapist";
          return (
            <Marker
              key={t.profile.id}
              position={[
                Number(t.profile.latitude),
                Number(t.profile.longitude),
              ]}
              icon={pinIcon}
            >
              <Popup>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold" data-testid={`popup-name-${t.profile.id}`}>
                    {fullName}
                  </span>
                  {t.profile.title && (
                    <span className="text-xs text-muted-foreground">
                      {t.profile.title}
                    </span>
                  )}
                  <Link
                    href={`/directory/${t.profile.id}`}
                    className="text-xs text-accent underline"
                    data-testid={`popup-link-${t.profile.id}`}
                  >
                    View Profile
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
