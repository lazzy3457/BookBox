"use client";

import { createContext, ReactNode, useContext } from "react";

const UserPreferencesContext = createContext({ hideSpoilers: true });

export function UserPreferencesProvider({ hideSpoilers, children }: { hideSpoilers: boolean; children: ReactNode }) {
  return <UserPreferencesContext.Provider value={{ hideSpoilers }}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
