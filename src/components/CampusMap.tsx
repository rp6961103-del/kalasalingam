import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CampusIssue, UserRole, CampusLandmark } from '../types';
import { KALASALINGAM_CENTER, CAMPUS_LANDMARKS, getNearestLandmark } from '../data/campusLocations';
import { MapPin, AlertTriangle, Layers, Navigation, Eye, CheckCircle2 } from 'lucide-react';

interface CampusMapProps {
  issues: CampusIssue[];
  selectedIssueId: string | null;
  onSelectIssue: (issue: CampusIssue) => void;
  pinLocation: { lat: number; lng: number } | null;
  onPinDropped: (coords: { lat: number; lng: number; landmarkName: string }) => void;
  userRole: UserRole;
  onStatusChange: (issueId: string, newStatus: any, note?: string) => Promise<void>;
  onUpvote: (issueId: string) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (val: boolean) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  issues,
  selectedIssueId,
  onSelectIssue,
  pinLocation,
  onPinDropped,
  userRole,
  onStatusChange,
  onUpvote,
  showHeatmap,
  onToggleHeatmap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const newPinMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: KALASALINGAM_CENTER,
      zoom: 16.5,
      zoomControl: false,
      attributionControl: true,
      minZoom: 15,
      maxZoom: 19,
    });

    // Add standard OpenStreetMap tiles with clean contrast
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | KARE Campus Facilities',
      maxZoom: 19,
    }).addTo(map);

    // Zoom controls at top right (matching Figure 5/6)
    L.control.zoom({ position: 'topleft' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    // Click handler on map to drop pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const { landmark } = getNearestLandmark(lat, lng);
      onPinDropped({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        landmarkName: landmark.name,
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update New Pin Marker when pinLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (newPinMarkerRef.current) {
      newPinMarkerRef.current.remove();
      newPinMarkerRef.current = null;
    }

    if (
      pinLocation &&
      pinLocation.lat != null &&
      pinLocation.lng != null &&
      !isNaN(Number(pinLocation.lat)) &&
      !isNaN(Number(pinLocation.lng))
    ) {
      const pinLat = Number(pinLocation.lat);
      const pinLng = Number(pinLocation.lng);

      const pinIcon = L.divIcon({
        className: 'custom-pin-drop',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
            <div class="relative bg-blue-600 text-white rounded-full p-2 shadow-2xl border-2 border-white transform hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="absolute -top-7 whitespace-nowrap bg-blue-900 text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow">
              New Pin
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 28],
      });

      newPinMarkerRef.current = L.marker([pinLat, pinLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      newPinMarkerRef.current.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        const { landmark } = getNearestLandmark(position.lat, position.lng);
        onPinDropped({
          lat: Number(position.lat.toFixed(6)),
          lng: Number(position.lng.toFixed(6)),
          landmarkName: landmark.name,
        });
      });
    }
  }, [pinLocation, onPinDropped]);

  // Render Issues Markers and Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    issues.forEach((issue) => {
      const rawLat = issue.lat ?? (issue as any).latitude;
      const rawLng = issue.lng ?? (issue as any).longitude;
      if (rawLat == null || rawLng == null) return;
      const lat = Number(rawLat);
      const lng = Number(rawLng);
      if (isNaN(lat) || isNaN(lng)) return;

      // Determine pin colors matching Figures 5 & 6
      // Red for Reported / Hazard, Amber for Assigned, Blue for In Progress, Green for Resolved
      let strokeColor = '#ef4444'; // Red
      let fillColor = '#ef4444';
      let ringClass = '';

      if (issue.status === 'Assigned') {
        strokeColor = '#f59e0b'; // Amber
        fillColor = '#f59e0b';
      } else if (issue.status === 'In Progress') {
        strokeColor = '#3b82f6'; // Blue
        fillColor = '#3b82f6';
      } else if (issue.status === 'Resolved') {
        strokeColor = '#10b981'; // Green
        fillColor = '#10b981';
      }

      if (issue.isHazard && issue.status !== 'Resolved') {
        ringClass = 'animate-pulse ring-4 ring-red-400 ring-opacity-75';
      }

      const iconHtml = `
        <div class="group relative flex items-center justify-center cursor-pointer">
          ${
            issue.isHazard && issue.status !== 'Resolved'
              ? '<span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-red-400 opacity-80"></span>'
              : ''
          }
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white ${ringClass}"
               style="background-color: ${fillColor};">
            ${
              issue.isHazard
                ? '⚠️'
                : issue.status === 'Resolved'
                ? '✓'
                : issue.category === 'Electrical'
                ? '⚡'
                : issue.category === 'Plumbing'
                ? '💧'
                : issue.category === 'Wi-Fi/Network'
                ? '📶'
                : '•'
            }
          </div>
          <div class="hidden group-hover:block absolute -top-8 bg-slate-900 text-white text-[11px] font-medium px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
            ${issue.title} (${issue.status})
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'campus-issue-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layer);

      // Popup Content matching Figure 5 precisely:
      // Title, Category, Description, "12 votes · priority 31", Upvote button, and Status dropdown for Admin
      const statusPillBg =
        issue.status === 'Resolved'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : issue.status === 'In Progress'
          ? 'bg-blue-100 text-blue-800 border-blue-300'
          : issue.status === 'Assigned'
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-red-100 text-red-800 border-red-300';

      const popupContainer = document.createElement('div');
      popupContainer.className = 'p-1 max-w-xs text-slate-800 font-sans';

      popupContainer.innerHTML = `
        <div class="space-y-2">
          <div>
            <div class="font-bold text-sm text-slate-900 leading-snug">${issue.title}</div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="inline-block text-[11px] px-2 py-0.5 rounded border font-semibold ${statusPillBg}">
                ${issue.status}
              </span>
              <span class="inline-block text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                ${issue.category}
              </span>
              ${
                issue.isHazard
                  ? '<span class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">HAZARD</span>'
                  : ''
              }
            </div>
          </div>

          <p class="text-xs text-slate-600 line-clamp-3 leading-relaxed">
            ${issue.description}
          </p>

          <div class="text-[11px] text-slate-500 flex items-center gap-1">
            <span>📍</span>
            <span class="font-medium truncate">${issue.locationName}</span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-700 pt-1 border-t border-slate-100">
            <span class="font-semibold text-amber-600 flex items-center gap-1">
              👍 ${issue.votes} votes · priority ${issue.priorityScore}
            </span>
            <button id="upvote-btn-${issue.id}" class="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded font-semibold transition active:scale-95 cursor-pointer">
              Upvote
            </button>
          </div>

          ${
            userRole === 'Management'
              ? `
            <div class="pt-2 border-t border-slate-200">
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">
                Management Status:
              </label>
              <select id="status-select-${issue.id}" class="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                <option value="Reported" ${issue.status === 'Reported' ? 'selected' : ''}>Reported</option>
                <option value="Assigned" ${issue.status === 'Assigned' ? 'selected' : ''}>Assigned</option>
                <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
              </select>
            </div>
            `
              : `
            <div class="pt-1 text-[11px] text-slate-500 italic">
              Assigned: <span class="font-semibold text-slate-700">${issue.assignedWorker?.name || 'Pending assignment'}</span>
            </div>
            `
          }

          <div class="pt-1">
            <button id="details-btn-${issue.id}" class="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-semibold py-1 hover:underline cursor-pointer">
              View Full Ticket & Audit Trail →
            </button>
          </div>
        </div>
      `;

      // Attach event handlers inside popup container
      const upvoteBtn = popupContainer.querySelector(`#upvote-btn-${issue.id}`);
      if (upvoteBtn) {
        upvoteBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onUpvote(issue.id);
        });
      }

      const statusSelect = popupContainer.querySelector(
        `#status-select-${issue.id}`
      ) as HTMLSelectElement | null;
      if (statusSelect) {
        statusSelect.addEventListener('change', async (ev) => {
          ev.stopPropagation();
          const target = ev.target as HTMLSelectElement;
          const nextStatus = target.value;
          await onStatusChange(issue.id, nextStatus);
        });
      }

      const detailsBtn = popupContainer.querySelector(`#details-btn-${issue.id}`);
      if (detailsBtn) {
        detailsBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectIssue(issue);
        });
      }

      marker.bindPopup(popupContainer, { maxWidth: 280 });

      // Automatically open popup if this is selectedIssueId
      if (selectedIssueId === issue.id) {
        marker.openPopup();
      }
    });
  }, [issues, selectedIssueId, userRole, onUpvote, onStatusChange, onSelectIssue]);

  // Pan to selected issue
  useEffect(() => {
    if (!selectedIssueId || !mapInstanceRef.current) return;
    const issue = issues.find((i) => i.id === selectedIssueId);
    if (issue) {
      const rawLat = issue.lat ?? (issue as any).latitude;
      const rawLng = issue.lng ?? (issue as any).longitude;
      if (rawLat != null && rawLng != null) {
        const lat = Number(rawLat);
        const lng = Number(rawLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          mapInstanceRef.current.setView([lat, lng], 18, { animate: true });
        }
      }
    }
  }, [selectedIssueId, issues]);

  // Render Heatmap overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = heatmapLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (showHeatmap) {
      issues.forEach((issue) => {
        const rawLat = issue.lat ?? (issue as any).latitude;
        const rawLng = issue.lng ?? (issue as any).longitude;
        if (rawLat == null || rawLng == null) return;
        const lat = Number(rawLat);
        const lng = Number(rawLng);
        if (isNaN(lat) || isNaN(lng)) return;

        const radius = Math.min(80, Math.max(30, issue.priorityScore * 1.5));
        const color = issue.isHazard
          ? '#dc2626'
          : issue.status === 'Resolved'
          ? '#10b981'
          : '#f97316';

        L.circle([lat, lng], {
          radius,
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.35,
        }).addTo(layer);
      });
    }
  }, [showHeatmap, issues]);

  // Quick navigation to a campus building
  const jumpToLandmark = (landmark: CampusLandmark) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([landmark.lat, landmark.lng], 18, { animate: true });
  };

  return (
    <div className="relative w-full h-full min-h-[540px] flex flex-col bg-slate-100 rounded-lg overflow-hidden border border-slate-300 shadow-inner">
      {/* Map Header Overlay Bar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md border border-slate-200">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHeatmap}
            onChange={(e) => onToggleHeatmap(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Heatmap view</span>
        </label>
      </div>

      {/* Campus Landmark Quick Navigation Drawer at bottom */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          Campus Blocks:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CAMPUS_LANDMARKS.slice(0, 6).map((lm) => (
            <button
              key={lm.code}
              onClick={() => jumpToLandmark(lm)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 rounded text-[11px] font-medium whitespace-nowrap transition cursor-pointer"
            >
              {lm.name.split(' ')[0]} {lm.name.split(' ')[1] || ''}
            </button>
          ))}
        </div>
      </div>

      {/* Main Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />
    </div>
  );
};
