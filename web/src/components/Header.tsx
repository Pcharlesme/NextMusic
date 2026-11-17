import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";

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
        <Tooltip title="About NextMusic">
          <IconButton component="a" href="#about" aria-label="About NextMusic" sx={{ color: "inherit", minWidth: 44, minHeight: 44 }}>
            <HelpOutlineRounded sx={{ fontSize: 30 }} />
          </IconButton>
        </Tooltip>
      </Container>
    </Box>
  );
}
