'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3B82F6', // blue-600
    },
    secondary: {
      main: '#9942f0', // purple-600
    },
    background: {
      default: '#F9FAFB', // gray-50
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Geist", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Space Grotesk", "Geist", sans-serif',
        },
      },
    },
  },
});

export default function CustomThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}