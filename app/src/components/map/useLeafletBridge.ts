import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  buildLeafletHtml,
  parseLeafletMessage,
  SRI_LANKA_CENTER,
  SRI_LANKA_ZOOM,
  type LatLng,
  type MapMarker,
} from "./leafletHtml";

export interface LeafletMapProps {
  /** Gig pins. Keep the array reference stable (useMemo) to avoid needless re-syncs. */
  markers?: MapMarker[];
  selectedId?: string | null;
  /** The single pin being chosen ("pick" mode) or highlighted ("view" mode). */
  picked?: LatLng | null;
  mode?: "view" | "pick";
  /** false renders a static preview that never steals scroll gestures. */
  interactive?: boolean;
  initialCenter?: LatLng;
  initialZoom?: number;
  onMarkerPress?: (id: string) => void;
  onPick?: (point: LatLng) => void;
  onMapPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

type Command = "setMarkers" | "setSelected" | "setPicked";

/**
 * Platform-independent half of LeafletMap: builds the page once, then keeps
 * it in sync with props by sending commands through `run` (supplied by the
 * native WebView or the web iframe).
 */
export function useLeafletBridge(props: LeafletMapProps, run: (command: Command, args: unknown[]) => void) {
  const { markers, selectedId, picked, mode = "view", interactive = true, onMarkerPress, onPick, onMapPress } = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The last pin placed by tapping/dragging inside the map itself. The page has
  // already drawn it, so echoing it back would only make the view jump.
  const lastMapPick = useRef<string | null>(null);

  // Built once on purpose: rebuilding the page would reload the whole map.
  const html = useMemo(
    () =>
      buildLeafletHtml({
        mode,
        interactive,
        center: props.initialCenter ?? picked ?? SRI_LANKA_CENTER,
        zoom: props.initialZoom ?? (props.initialCenter || picked ? 15 : SRI_LANKA_ZOOM),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const markersKey = JSON.stringify(markers ?? []);
  const pickedLatitude = picked?.latitude;
  const pickedLongitude = picked?.longitude;

  useEffect(() => {
    if (ready) run("setMarkers", [JSON.parse(markersKey), true]);
  }, [ready, markersKey, run]);

  useEffect(() => {
    if (ready) run("setSelected", [selectedId ?? null]);
  }, [ready, selectedId, markersKey, run]);

  useEffect(() => {
    if (!ready) return;
    if (lastMapPick.current === `${pickedLatitude},${pickedLongitude}`) return;
    lastMapPick.current = null;
    const point =
      pickedLatitude != null && pickedLongitude != null
        ? { latitude: pickedLatitude, longitude: pickedLongitude }
        : null;
    run("setPicked", [point, true]);
  }, [ready, pickedLatitude, pickedLongitude, run]);

  const handleMessage = useCallback(
    (raw: unknown) => {
      const message = parseLeafletMessage(raw);
      if (!message) return;
      if (message.type === "ready") setReady(true);
      else if (message.type === "error") setFailed(true);
      else if (message.type === "marker") onMarkerPress?.(message.id);
      else if (message.type === "pick") {
        lastMapPick.current = `${message.latitude},${message.longitude}`;
        onPick?.({ latitude: message.latitude, longitude: message.longitude });
      }
      else if (message.type === "mapPress") onMapPress?.();
    },
    [onMarkerPress, onPick, onMapPress]
  );

  return { html, ready, failed, interactive, handleMessage };
}
