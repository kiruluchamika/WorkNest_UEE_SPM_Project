import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

import { colors } from "../../theme/colors";
import { useLeafletBridge, type LeafletMapProps } from "./useLeafletBridge";

/**
 * Browser build of LeafletMap (Expo Web, used by the Playwright suite).
 * react-native-webview has no web implementation, so the same Leaflet page
 * is hosted in an iframe and driven with postMessage.
 */
export const LeafletMap: React.FC<LeafletMapProps> = (props) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const run = useCallback((command: string, args: unknown[]) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ wn: command, args }), "*");
  }, []);

  const { html, interactive, handleMessage } = useLeafletBridge(props, run);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow) handleMessage(event.data);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [handleMessage]);

  return (
    <View style={[styles.container, props.style]} pointerEvents={interactive ? "auto" : "none"}>
      {React.createElement("iframe", {
        ref: iframeRef,
        srcDoc: html,
        title: "Map",
        style: { border: 0, width: "100%", height: "100%" },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: colors.background,
  },
});
