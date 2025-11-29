import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { SwapPage } from "./pages/SwapPage";
import { DeployWalletPage } from "./pages/DeployWalletPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <SwapPage /> },
      { path: "deploy-wallet", element: <DeployWalletPage /> },
    ],
  },
]);
