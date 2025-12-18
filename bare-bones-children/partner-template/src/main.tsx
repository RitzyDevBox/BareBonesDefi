import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./Router";
import { AppThemeProvider } from "./hooks/useThemeProvider";
import { ThemeMode } from "./themes/theme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider mode={ThemeMode.DARK}>
      <RouterProvider router={router} />
    </AppThemeProvider>
  </React.StrictMode>
);
