import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#171717" },
    success: { main: "#171717" },
    text: { primary: "#171717", secondary: "#595959" },
    background: { default: "#FFFFFF", paper: "#FFFFFF" },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: "Arial, Helvetica, system-ui, sans-serif",
    h1: { fontWeight: 700, letterSpacing: "-0.055em" },
    h2: { fontWeight: 700, letterSpacing: "-0.04em" },
    h3: { fontWeight: 700, letterSpacing: "-0.03em" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 4, minHeight: 44 } },
    },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 4 } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: { margin: 0 },
        "*:focus-visible": { outline: "3px solid #171717", outlineOffset: 3 },
      },
    },
  },
});
