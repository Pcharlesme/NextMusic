import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

export function Header() {
  return (
    <Box component="header" className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Container maxWidth="xl" className="header-inner">
        <a href={import.meta.env.BASE_URL} aria-label="NextMusic home" className="brand-link">
          <span className="brand-wordmark">
            next<span>music</span>
          </span>
        </a>
      </Container>
    </Box>
  );
}
