import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./Router";

import { ThemeModeProvider } from "./themes/ThemeModeContext";
import { AppThemeProvider } from "./themes/AppThemeProvider";

import "./app.css";
import { WalletProvider } from "./hooks/providers/WalletContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <ThemeModeProvider>
        <AppThemeProvider>
          <RouterProvider router={router} />
        </AppThemeProvider>
      </ThemeModeProvider>
    </WalletProvider>
  </React.StrictMode>
);
