import { createContext } from "react";
import { WalletContextValue } from "./WalletContext";

export const WalletContext = createContext<WalletContextValue | null>(null)