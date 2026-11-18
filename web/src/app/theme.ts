import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#171717" },
    success: { main: "#171717" },
    text: { primary: "#171717", secondary: "#595959" },
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Inter Fallback", system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.045em" },
    h2: { fontWeight: 700, letterSpacing: "-0.03em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 800, letterSpacing: "-0.03em" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, minHeight: 44 } },
    },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { margin: 0 },
        "*:focus-visible": { outline: "3px solid #171717", outlineOffset: 3 },
      },
    },
  },
});
