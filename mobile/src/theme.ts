export const colors = {
  ink: "#0c1117",
  night: "#121a23",
  panel: "#18212b",
  panelSoft: "#222d38",
  paper: "#f7f1e7",
  muted: "#a8b0ba",
  subtle: "#727d89",
  line: "#2e3b49",
  mint: "#9ee493",
  lime: "#c7f464",
  coral: "#ff6f61",
  amber: "#f6c85f",
  sky: "#7fc8f8",
  blue: "#64a6ff",
  overlay: "rgba(12, 17, 23, 0.72)"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5
  }
};

export const statusLabels = {
  TO_READ: "A lire",
  READING: "En cours",
  READ: "Lu",
  ABANDONED: "Abandonne"
} as const;
