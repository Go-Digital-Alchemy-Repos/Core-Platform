import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "wouter";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { User } from "@shared/schema/users";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface TherapistWithUser {
  profile: TherapistProfile;
  user: Pick<User, "firstName" | "lastName">;
}

interface MapViewProps {
  therapists: TherapistWithUser[];
}

export function MapView({ therapists }: MapViewProps) {
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

  const zoom = markered.length === 0 ? 2 : markered.length === 1 ? 12 : 3;

  return (
    <div className="h-[500px] rounded-md overflow-hidden border" data-testid="map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
