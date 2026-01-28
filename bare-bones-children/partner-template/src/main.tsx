import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./Router";

import { ThemeModeProvider } from "./themes/ThemeModeContext";
import { AppThemeProvider } from "./themes/AppThemeProvider";

import "./app.css";
import { WalletProvider } from "./hooks/providers/WalletContext";
import { WalletConnectProvider } from "./components/WalletConnect/WalletConnectProvider";
import { Buffer } from "buffer";
import { TxRefreshProvider } from "./providers/TxRefreshProvider";

(window as any).Buffer = Buffer;


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TxRefreshProvider>
      <WalletProvider>
        <WalletConnectProvider>
          <ThemeModeProvider>
            <AppThemeProvider>
              <RouterProvider router={router} />
            </AppThemeProvider>
          </ThemeModeProvider>
        </WalletConnectProvider>
      </WalletProvider>
    </TxRefreshProvider>
  </React.StrictMode>
);
