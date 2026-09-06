import { useEffect, useRef, type ReactNode } from "react";
import Map, { NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MAP_STYLE_URL, applyLightMapStyle } from "@/lib/map-style";

export function BaseMap({
  center,
  zoom,
  interactive = true,
  children,
}: {
  center: [number, number];
  zoom: number;
  interactive?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<MapRef>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(() => ref.current?.resize());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    ref.current?.jumpTo({ center: [center[1], center[0]], zoom });
  }, [center[0], center[1], zoom]);
  return (
    <div ref={container} className="h-full w-full">
      <Map
        ref={ref}
        workerUrl={workerUrl}
        initialViewState={{ latitude: center[0], longitude: center[1], zoom }}
        mapStyle={MAP_STYLE_URL}
        onLoad={({ target }) => {
          const original = target.getStyle();
          const styled = applyLightMapStyle(undefined, original);
          styled.layers.forEach((layer, index) => {
            if (layer === original.layers[index] || !layer.paint) return;
            Object.entries(layer.paint).forEach(([property, value]) =>
              target.setPaintProperty(
                layer.id,
                property as Parameters<typeof target.setPaintProperty>[1],
                value,
              ),
            );
          });
        }}
        scrollZoom={interactive}
        dragPan={interactive}
        doubleClickZoom={interactive}
        keyboard={interactive}
        boxZoom={interactive}
        touchZoomRotate={interactive}
        dragRotate={false}
        touchPitch={false}
        style={{ height: "100%", width: "100%" }}
      >
        {interactive && <NavigationControl position="top-left" showCompass={false} />}
        {children}
      </Map>
    </div>
  );
}

export function MapPin({
  highlighted = false,
  label,
  onClick,
}: {
  highlighted?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="block cursor-pointer border-0 bg-transparent p-0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={highlighted ? 34 : 28}
        height={highlighted ? 48 : 40}
        viewBox="0 0 28 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z"
          fill={highlighted ? "#2d8a7e" : "#1e3a5f"}
        />
        <circle cx="14" cy="14" r="7" fill="white" />
      </svg>
    </button>
  );
}
