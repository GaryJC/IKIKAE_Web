import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0a0a0a" },
    secondary: { main: "#0a0a0a" },
    background: {
      default: "#fcfcfc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0a0a0a",
      secondary: "#525252",
    },
    divider: "rgba(0,0,0,0.12)",
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily:
      'var(--font-geist-sans), "Geist", "Space Grotesk", system-ui, -apple-system, Segoe UI, sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(0,0,0,0.12)",
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 999,
          paddingLeft: 18,
          paddingRight: 18,
        },
        containedPrimary: {
          backgroundColor: "#0a0a0a",
          color: "#fcfcfc",
          "&:hover": {
            backgroundColor: "#111111",
          },
        },
        outlinedPrimary: {
          borderColor: "rgba(0,0,0,0.28)",
          color: "#0a0a0a",
          "&:hover": {
            borderColor: "rgba(0,0,0,0.38)",
            backgroundColor: "rgba(0,0,0,0.04)",
          },
        },
        textPrimary: {
          color: "#0a0a0a",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }),
        icon: {
          color: "#0a0a0a",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
  },
});
