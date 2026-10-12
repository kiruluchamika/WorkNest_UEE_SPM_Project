import { colors } from "../../theme/colors";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapMarker extends LatLng {
  id: string;
  /** Short text shown inside the pin (e.g. a pay amount). Falls back to a plain dot pin. */
  label?: string;
}

export interface LeafletHtmlOptions {
  mode: "view" | "pick";
  interactive: boolean;
  center: LatLng;
  zoom: number;
}

/** Roughly the middle of Sri Lanka, zoomed out to show the whole island. */
export const SRI_LANKA_CENTER: LatLng = { latitude: 7.8731, longitude: 80.7718 };
export const SRI_LANKA_ZOOM = 7;

/** Kept in sync with SRI_LANKA_BOUNDS in server/src/validators/gig.validator.ts. */
export const SRI_LANKA_BOUNDS = {
  minLatitude: 5.7,
  maxLatitude: 10.0,
  minLongitude: 79.4,
  maxLongitude: 82.1,
} as const;

export function isInsideSriLanka(point: LatLng): boolean {
  return (
    point.latitude >= SRI_LANKA_BOUNDS.minLatitude &&
    point.latitude <= SRI_LANKA_BOUNDS.maxLatitude &&
    point.longitude >= SRI_LANKA_BOUNDS.minLongitude &&
    point.longitude <= SRI_LANKA_BOUNDS.maxLongitude
  );
}

const LEAFLET_VERSION = "1.9.4";

/**
 * Builds the self-contained Leaflet page shown inside the WebView (native) or
 * iframe (web). The page is created once; later changes are pushed in through
 * `window.WN.*` so the map never reloads. It reports back with JSON messages:
 * { type: "ready" | "marker" | "pick" | "mapPress" | "error", ... }.
 */
export function buildLeafletHtml(options: LeafletHtmlOptions): string {
  const config = JSON.stringify({
    mode: options.mode,
    interactive: options.interactive,
    center: [options.center.latitude, options.center.longitude],
    zoom: options.zoom,
    bounds: [
      [SRI_LANKA_BOUNDS.minLatitude - 1.5, SRI_LANKA_BOUNDS.minLongitude - 2],
      [SRI_LANKA_BOUNDS.maxLatitude + 1.5, SRI_LANKA_BOUNDS.maxLongitude + 2],
    ],
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.background}; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
  .leaflet-control-attribution { font-size: 9px; }
  .wn-dot {
    position: absolute; left: 50%; bottom: 5px; width: 26px; height: 26px; margin-left: -13px;
    background: ${colors.primary}; border: 3px solid #fff; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg); box-sizing: border-box;
    box-shadow: 0 3px 8px rgba(4, 95, 112, 0.35);
  }
  .wn-dot::after {
    content: ""; position: absolute; left: 50%; top: 50%; width: 8px; height: 8px;
    margin: -4px 0 0 -4px; background: #fff; border-radius: 50%;
  }
  .wn-chip {
    position: absolute; left: 50%; bottom: 7px; transform: translateX(-50%);
    background: #fff; color: ${colors.primaryDark}; border: 2px solid ${colors.primary};
    border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 700; white-space: nowrap;
    box-shadow: 0 3px 8px rgba(4, 95, 112, 0.28);
  }
  .wn-chip::after {
    content: ""; position: absolute; left: 50%; bottom: -7px; margin-left: -5px;
    border: 5px solid transparent; border-top-color: ${colors.primary}; border-bottom-width: 0;
  }
  .wn-selected .wn-chip { background: ${colors.primaryDark}; color: #fff; border-color: ${colors.primaryDark}; }
  .wn-selected .wn-chip::after { border-top-color: ${colors.primaryDark}; }
  .wn-selected .wn-dot { background: ${colors.primaryDark}; }
  .wn-picked .wn-dot { background: ${colors.danger}; width: 30px; height: 30px; margin-left: -15px; bottom: 6px; }
  .wn-offline {
    height: 100%; display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 16px; box-sizing: border-box; color: ${colors.textMuted}; font-size: 13px;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
<script>
(function () {
  var CONFIG = ${config};

  function send(message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent && window.parent !== window) window.parent.postMessage(text, "*");
  }

  if (!window.L) {
    document.getElementById("map").innerHTML =
      '<div class="wn-offline">Map could not load. Check your internet connection.</div>';
    send({ type: "error" });
    return;
  }

  var on = CONFIG.interactive;
  var map = L.map("map", {
    zoomControl: on,
    dragging: on,
    touchZoom: on,
    scrollWheelZoom: on,
    doubleClickZoom: on,
    boxZoom: on,
    keyboard: on,
    tap: on,
    minZoom: 6,
    maxBounds: CONFIG.bounds,
    maxBoundsViscosity: 0.8
  }).setView(CONFIG.center, CONFIG.zoom);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  var markerLayer = L.layerGroup().addTo(map);
  var markersById = {};
  var selectedId = null;
  var pickedMarker = null;
  // Re-applies the last automatic framing if the container is resized before
  // the person has touched the map (WebViews often lay out after page load).
  var reframe = null;
  var touched = false;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pinIcon(marker, extraClass) {
    var inner = marker && marker.label
      ? '<div class="wn-chip">' + escapeHtml(marker.label) + "</div>"
      : '<div class="wn-dot"></div>';
    return L.divIcon({
      className: "wn-pin " + (extraClass || ""),
      html: inner,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  }

  function setMarkers(list, fit) {
    markerLayer.clearLayers();
    markersById = {};
    var points = [];
    (list || []).forEach(function (m) {
      var point = [m.latitude, m.longitude];
      points.push(point);
      var marker = L.marker(point, { icon: pinIcon(m, m.id === selectedId ? "wn-selected" : ""), keyboard: false });
      marker.wnData = m;
      marker.on("click", function () { send({ type: "marker", id: m.id }); });
      marker.addTo(markerLayer);
      markersById[m.id] = marker;
    });
    if (!fit || points.length === 0) return;
    reframe = function () {
      if (points.length === 1) map.setView(points[0], 15, { animate: false });
      else map.fitBounds(points, { padding: [48, 48], maxZoom: 15, animate: false });
    };
    reframe();
  }

  function setSelected(id) {
    var previous = selectedId && markersById[selectedId];
    if (previous) { previous.setIcon(pinIcon(previous.wnData, "")); previous.setZIndexOffset(0); }
    selectedId = id || null;
    var next = selectedId && markersById[selectedId];
    if (next) {
      next.setIcon(pinIcon(next.wnData, "wn-selected"));
      next.setZIndexOffset(1000);
      map.panTo(next.getLatLng());
    }
  }

  function setPicked(point, recenter) {
    if (!point) {
      if (pickedMarker) { map.removeLayer(pickedMarker); pickedMarker = null; }
      return;
    }
    var latlng = [point.latitude, point.longitude];
    if (!pickedMarker) {
      pickedMarker = L.marker(latlng, {
        icon: pinIcon(null, "wn-picked"),
        draggable: CONFIG.mode === "pick" && on,
        keyboard: false
      }).addTo(map);
      pickedMarker.on("dragend", function () {
        var p = pickedMarker.getLatLng();
        send({ type: "pick", latitude: p.lat, longitude: p.lng });
      });
    } else {
      pickedMarker.setLatLng(latlng);
    }
    if (recenter) {
      reframe = function () { map.setView(latlng, Math.max(map.getZoom(), 15), { animate: false }); };
      reframe();
    }
  }

  map.on("click", function (e) {
    if (CONFIG.mode === "pick") {
      setPicked({ latitude: e.latlng.lat, longitude: e.latlng.lng }, false);
      send({ type: "pick", latitude: e.latlng.lat, longitude: e.latlng.lng });
    } else {
      send({ type: "mapPress" });
    }
  });

  window.WN = { setMarkers: setMarkers, setSelected: setSelected, setPicked: setPicked };

  // Web (iframe) delivers commands as messages; native calls window.WN directly.
  window.addEventListener("message", function (event) {
    try {
      var command = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (command && command.wn && window.WN[command.wn]) window.WN[command.wn].apply(null, command.args || []);
    } catch (err) {}
  });

  // The container can be laid out after the page loads (modals, tabs).
  function handleResize() {
    map.invalidateSize({ animate: false });
    if (reframe && !touched) reframe();
  }
  var container = document.getElementById("map");
  ["mousedown", "touchstart", "wheel"].forEach(function (name) {
    container.addEventListener(name, function () { touched = true; }, { passive: true });
  });
  setTimeout(handleResize, 250);
  window.addEventListener("resize", handleResize);
  if (window.ResizeObserver) new ResizeObserver(handleResize).observe(container);

  send({ type: "ready" });
})();
</script>
</body>
</html>`;
}

export type LeafletMapMessage =
  | { type: "ready" }
  | { type: "error" }
  | { type: "mapPress" }
  | { type: "marker"; id: string }
  | { type: "pick"; latitude: number; longitude: number };

export function parseLeafletMessage(raw: unknown): LeafletMapMessage | null {
  if (typeof raw !== "string") return null;
  try {
    const message = JSON.parse(raw) as LeafletMapMessage;
    return message && typeof message.type === "string" ? message : null;
  } catch {
    return null;
  }
}
