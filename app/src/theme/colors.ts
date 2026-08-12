export const colors = {
  // Primary palette
  primary: "#FF7A3D",
  primaryDark: "#C14513",
  primarySoft: "#FFE3D5",

  // Backgrounds
  background: "#F8F4EA",
  surface: "#FFFDF7",
  cream: "#EFECE2",
  warmPanel: "#FFF0D9",

  // Text
  text: "#2D251E",
  textMuted: "#81776A",
  textInverse: "#FFFFFF",

  // Accents / semantic
  success: "#16875E",
  successLight: "#DCF2E8",
  warning: "#D98918",
  danger: "#D54B35",
  dangerLight: "#FDECE8",
  info: "#2D6A7A",
  trust: "#16875E",

  // Borders / dividers
  border: "#E3DCCF",
  borderStrong: "#D4C8B8",
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
