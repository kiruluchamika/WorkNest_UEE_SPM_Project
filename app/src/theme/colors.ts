export const colors = {
  // Primary palette (matches the WorkNest logo teal)
  primary: "#0090A6",
  primaryDark: "#045F70",
  primarySoft: "#DCF2F4",

  // Accent (matches the WorkNest logo lime)
  accent: "#C7C804",
  accentDark: "#8C8D03",
  accentSoft: "#F4F7D6",

  // Backgrounds
  background: "#F2FAFA",
  surface: "#FFFFFF",
  cream: "#E8F2F2",
  warmPanel: "#F4F7D6",

  // Text
  text: "#1F2A2E",
  textMuted: "#667479",
  textInverse: "#FFFFFF",

  // Accents / semantic
  success: "#16875E",
  successLight: "#DCF2E8",
  warning: "#D98918",
  danger: "#D54B35",
  dangerLight: "#FDECE8",
  info: "#3B6FA5",
  trust: "#16875E",

  // Borders / dividers
  border: "#DCE8E8",
  borderStrong: "#C3D6D6",
  shadow: "#000000",
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};
