"use client";

import { forwardRef, useEffect, useRef } from "react";
import { Map, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  /** [minLng, minLat, maxLng, maxLat] — the map fits to this once on mount
   * and whenever it changes (e.g. a new region was picked). */
  fitBounds: [number, number, number, number];
  children?: React.ReactNode;
}

export const MapCanvas = forwardRef<MapRef, Props>(function MapCanvas({ fitBounds, children }, ref) {
  const internalRef = useRef<MapRef | null>(null);

  useEffect(() => {
    const map = internalRef.current;
    if (!map) return;
    map.fitBounds(
      [
        [fitBounds[0], fitBounds[1]],
        [fitBounds[2], fitBounds[3]],
      ],
      { padding: 40, animate: false }
    );
  }, [fitBounds]);

  return (
    <div className="absolute inset-0">
      <Map
        ref={(instance) => {
          internalRef.current = instance;
          if (typeof ref === "function") ref(instance);
          else if (ref) ref.current = instance;
        }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          bounds: fitBounds,
          fitBoundsOptions: { padding: 40 },
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        dragPan={false}
        dragRotate={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
      >
        {children}
      </Map>
    </div>
  );
});
