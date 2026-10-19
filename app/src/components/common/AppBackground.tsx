import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "../../theme/colors";

// Every layer fills the whole screen and fades to fully transparent before it
// reaches the bottom, so the glow only ever ends on a screen edge (no hard
// seams) and the lower part of the screen matches the flat colors.background
// that the tab bar sits on.
export const AppBackground: React.FC = () => (
  <View pointerEvents="none" style={styles.root}>
    {/* Soft teal wash behind the header area */}
    <LinearGradient
      colors={[colors.primarySoft, "rgba(220, 242, 244, 0)"]}
      locations={[0, 0.42]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    {/* Teal glow from the top-right corner */}
    <LinearGradient
      colors={["rgba(0, 144, 166, 0.20)", "rgba(0, 144, 166, 0)"]}
      locations={[0, 0.5]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 0.6 }}
      style={StyleSheet.absoluteFill}
    />
    {/* Lime glow from the top-left corner (logo accent) */}
    <LinearGradient
      colors={["rgba(199, 200, 4, 0.13)", "rgba(199, 200, 4, 0)"]}
      locations={[0, 0.38]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.55 }}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

/**
 * Shared `screenLayout` for the navigators: paints the app background behind
 * each screen. It is drawn per screen (not once at the root) because stack
 * screens sit on top of each other, so each one needs its own opaque backdrop.
 */
export const appScreenLayout = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.screen}>
    <AppBackground />
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
});
