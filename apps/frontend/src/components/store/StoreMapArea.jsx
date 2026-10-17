// ============================================================
// StoreMapArea — OpenStreetMap panel with real store positions
// Used as the right panel in Store Locator
// ============================================================

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map } from 'lucide-react';
import StoreDetailPopup from './StoreDetailPopup';
import { hasCoords } from '../../utils/storeUtils';

const INDIA_CENTER = [22.5, 79];
const PRIMARY = '#006A6A';

/** Fit the viewport to the visible stores, and pan to the selected one. */
function FitToStores({ points, selected }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);

  useEffect(() => {
    if (selected && hasCoords(selected)) {
      map.panTo([Number(selected.latitude), Number(selected.longitude)]);
    }
  }, [map, selected]);

  return null;
}

/**
 * @param {object}   props
 * @param {Array}    props.stores         - List of store objects
 * @param {object}   props.selectedStore  - Currently selected store (or null)
 * @param {function} props.onSelectStore  - Store selection callback
 */
export default function StoreMapArea({ stores, selectedStore, onSelectStore }) {
  const mapped = useMemo(() => stores.filter(hasCoords), [stores]);
  const points = useMemo(
    () => mapped.map((s) => [Number(s.latitude), Number(s.longitude)]),
    [mapped],
  );

  return (
    // `isolate` keeps Leaflet's internal z-indexes from rising above the sticky navbar.
    <div className="sticky top-24 h-[calc(100vh-200px)] min-h-[500px] rounded-xl overflow-hidden ghost-border clinical-shadow isolate">
      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        scrollWheelZoom
        className="absolute inset-0 h-full w-full z-0"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToStores points={points} selected={selectedStore} />
        {mapped.map((store) => {
          const isSelected = selectedStore?.pmbjk_code === store.pmbjk_code;
          return (
            <CircleMarker
              key={store.pmbjk_code}
              center={[Number(store.latitude), Number(store.longitude)]}
              radius={isSelected ? 11 : 8}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: PRIMARY,
                fillOpacity: isSelected ? 1 : 0.7,
              }}
              eventHandlers={{ click: () => onSelectStore(store) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>{store.name}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Selected store detail */}
      <div className="absolute inset-0 z-[1000] pointer-events-none [&>*]:pointer-events-auto">
        <StoreDetailPopup store={selectedStore} />
      </div>

      {/* Empty map branding */}
      {stores.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-surface/70 backdrop-blur-[2px] pointer-events-none">
          <div className="w-24 h-24 bg-primary/6 rounded-2xl flex items-center justify-center mb-6 border border-primary/10">
            <Map className="w-12 h-12 text-primary/40" />
          </div>
          <div className="text-on-surface/60 font-display font-bold text-xl mb-2">Store Locations</div>
          <div className="text-on-surface/50 text-sm font-medium">Search to discover nearby Kendras</div>
        </div>
      )}
    </div>
  );
}
