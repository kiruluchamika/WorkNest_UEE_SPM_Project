import React, { useCallback, useRef } from "react";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { colors } from "../../theme/colors";
import { useLeafletBridge, type LeafletMapProps } from "./useLeafletBridge";

// Gives the embedded page a real origin so the tile server receives a referer.
const BASE_URL = "https://worknest.app/";

/**
 * Leaflet map for iOS/Android, rendered in a WebView (Leaflet is a web
 * library). Works in Expo Go and needs no API key. The browser build uses
 * LeafletMap.web.tsx instead, since react-native-webview has no web support.
 */
export const LeafletMap: React.FC<LeafletMapProps> = (props) => {
  const webViewRef = useRef<WebView>(null);

  const run = useCallback((command: string, args: unknown[]) => {
    webViewRef.current?.injectJavaScript(
      `window.WN && window.WN.${command}.apply(null, ${JSON.stringify(args)}); true;`
    );
  }, []);

  const { html, ready, failed, interactive, handleMessage } = useLeafletBridge(props, run);

  return (
    <View style={[styles.container, props.style]} pointerEvents={interactive ? "auto" : "none"}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html, baseUrl: BASE_URL }}
        onMessage={(event) => handleMessage(event.nativeEvent.data)}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        // Attribution links open in the device browser instead of replacing the map.
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith(BASE_URL) || request.url.startsWith("about:")) return true;
          void Linking.openURL(request.url).catch(() => {});
          return false;
        }}
        style={styles.webView}
      />
      {!ready && !failed ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.primaryDark} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
