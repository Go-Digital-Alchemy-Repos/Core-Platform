import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFirstSentence } from "@/lib/html";
import type { TherapistProfile } from "@shared/schema/therapist-profiles";
import type { User } from "@shared/schema/users";

const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" fill="none">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#1e3a5f"/>
  <circle cx="14" cy="14" r="7" fill="white"/>
</svg>`;

const pinHighlightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="48" viewBox="0 0 34 48" fill="none">
  <path d="M17 0C7.611 0 0 7.611 0 17c0 12.75 17 31 17 31s17-18.25 17-31C34 7.611 26.389 0 17 0z" fill="#2d8a7e"/>
  <circle cx="17" cy="17" r="8.5" fill="white"/>
</svg>`;

const pinIcon = L.divIcon({
  html: pinSvg,
  className: "",
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

const pinHighlightIcon = L.divIcon({
  html: pinHighlightSvg,
  className: "",
  iconSize: [34, 48],
  iconAnchor: [17, 48],
  popupAnchor: [0, -44],
});

interface TherapistWithUser {
  profile: TherapistProfile;
  user: Pick<User, "firstName" | "lastName"> & { profileImageUrl?: string | null };
}

interface MapViewProps {
  therapists: TherapistWithUser[];
  height?: string;
  interactive?: boolean;
  zoom?: number;
  center?: [number, number];
  highlightedId?: string | null;
}

function MapSizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    invalidate();

    const timeout = window.setTimeout(invalidate, 120);
    const resizeObserver = new ResizeObserver(() => invalidate());
    resizeObserver.observe(container);

    return () => {
      window.clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

export function MapView({ therapists, height = "500px", interactive = true, zoom: zoomProp, center: centerProp, highlightedId }: MapViewProps) {
  const markered = useMemo(
    () =>
      therapists.filter(
        (t) => Number.isFinite(Number(t.profile.latitude)) && Number.isFinite(Number(t.profile.longitude))
      ),
    [therapists]
  );

  const center = useMemo<[number, number]>(() => {
    if (centerProp) return centerProp;
    if (markered.length === 0) return [20, 0];
    const avgLat =
      markered.reduce((sum, t) => sum + Number(t.profile.latitude), 0) /
      markered.length;
    const avgLng =
      markered.reduce((sum, t) => sum + Number(t.profile.longitude), 0) /
      markered.length;
    return [avgLat, avgLng];
  }, [markered, centerProp]);

  const zoom = zoomProp ?? (markered.length === 0 ? 2 : markered.length === 1 ? 6 : 3);

  const tileUrl = interactive
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = interactive
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const hasPercentHeight = typeof height === "string" && height.includes("%");

  return (
    <div
      style={{ height, minHeight: hasPercentHeight ? "420px" : height }}
      className="rounded-md overflow-hidden border isolate"
      data-testid="map-container"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="h-full w-full"
      >
        <MapSizeInvalidator />
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {markered.map((t) => {
          const fullName =
            [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") ||
            "Mental Health Professional";
          const isHighlighted = highlightedId === t.profile.id;
          return (
            <Marker
              key={t.profile.id}
              position={[
                Number(t.profile.latitude),
                Number(t.profile.longitude),
              ]}
              icon={isHighlighted ? pinHighlightIcon : pinIcon}
              zIndexOffset={isHighlighted ? 1000 : 0}
            >
              <Popup>
                <div className="flex gap-2.5 max-w-[240px]" data-testid={`popup-${t.profile.id}`}>
                  <Avatar className="h-10 w-10 shrink-0" data-testid={`popup-avatar-${t.profile.id}`}>
                    {t.user.profileImageUrl && (
                      <AvatarImage src={t.user.profileImageUrl} alt={fullName} />
                    )}
                    <AvatarFallback className="text-xs">
                      {`${(t.user.firstName || "")[0] || ""}${(t.user.lastName || "")[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-sm leading-tight" data-testid={`popup-name-${t.profile.id}`}>
                      {fullName}
                    </span>
                    {t.profile.title && (
                      <span className="text-xs text-gray-500 leading-tight">
                        {t.profile.title}
                      </span>
                    )}
                    {t.profile.bio && (
                      <span className="text-xs text-gray-600 leading-snug mt-0.5 line-clamp-2">
                        {getFirstSentence(t.profile.bio)}
                      </span>
                    )}
                    <Link
                      href={`/directory/${t.profile.id}`}
                      className="text-xs font-medium mt-1"
                      style={{ color: "#2d8a7e" }}
                      data-testid={`popup-link-${t.profile.id}`}
                    >
                      View Profile →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
