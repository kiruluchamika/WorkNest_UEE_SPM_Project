export const colors = {
  // Primary palette (matches the WorkNest logo teal)
  primary: "#0090A6",
  primaryDark: "#045F70",
  primarySoft: "#DCF2F4",
  primaryLight: "#EBF8F9",

  // Accent (matches the WorkNest logo lime)
  accent: "#C7C804",
  accentDark: "#8C8D03",
  accentSoft: "#F4F7D6",

  // Backgrounds & Surfaces
  background: "#EEF5F6",
  surface: "#FFFFFF",
  surfaceSubtle: "#F9FCFC",
  cream: "#E8F2F2",
  warmPanel: "#F4F7D6",

  // Text hierarchy
  text: "#152429",
  textSecondary: "#3D525A",
  textMuted: "#6B8088",
  textInverse: "#FFFFFF",
  textPlaceholder: "#9AB0B7",

  // Accents / semantic
  success: "#0E8555",
  successLight: "#E8F8F0",
  successBorder: "#BCEBD4",
  successText: "#0E7A4E",

  warning: "#D97706",
  warningLight: "#FFF6E5",
  warningBorder: "#FFE2B3",
  warningText: "#B26A00",

  danger: "#D53B25",
  dangerLight: "#FDEEEB",
  dangerBorder: "#F8CCC4",
  dangerText: "#C23E28",

  info: "#2563EB",
  infoLight: "#EFF6FF",
  infoBorder: "#BFDBFE",
  infoText: "#1D4ED8",

  neutralLight: "#F1F5F7",
  neutralBorder: "#DCE5E8",
  neutralText: "#5E737B",

  purpleLight: "#F3E8FF",
  purpleBorder: "#E9D5FF",
  purpleText: "#6B21A8",

  trust: "#0E8555",

  // Borders / dividers
  border: "#E2ECEE",
  borderStrong: "#CADBDD",
  borderLight: "#EEF4F5",
  shadow: "#045F70",
};

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};

