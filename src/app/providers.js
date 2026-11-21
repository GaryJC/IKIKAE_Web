"use client"

import { ThemeProvider } from "@mui/material/styles";
import { muiTheme } from "./muiTheme";

export default function Providers({ children }) {
    return (
        <ThemeProvider theme={muiTheme}>
            {children}
        </ThemeProvider>
    )
}
