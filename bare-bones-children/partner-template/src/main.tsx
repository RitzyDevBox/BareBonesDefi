import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./Router";

import { ThemeModeProvider } from "./themes/ThemeModeContext";
import { AppThemeProvider } from "./themes/AppThemeProvider";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <AppThemeProvider>
        <RouterProvider router={router} />
      </AppThemeProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);
