import { createTheme } from '@mui/material/styles';

export const muiTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2563eb'
        },
        secondary: {
            main: '#9333ea'
        },
        background: {
            default: '#f3f4f6',
            paper: '#ffffff'
        }
    },
    typography: {
        fontFamily: 'Inter, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        h1: {
            fontWeight: 600
        },
        h2: {
            fontWeight: 600
        },
        h3: {
            fontWeight: 600
        }
    },
    shape: {
        borderRadius: 10
    },
    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true
            },
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12
                }
            }
        }
    }
});
