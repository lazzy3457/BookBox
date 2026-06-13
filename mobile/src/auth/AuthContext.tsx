import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { registerForPushNotifications, unregisterPushToken } from "../notifications/push";
import type { NotificationPreference, User } from "../types";

const TOKEN_KEY = "bookbox.mobileToken";

type AuthState = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; username: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (nextToken: string, nextUser: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    if (token && expoPushToken) {
      await unregisterPushToken(token, expoPushToken).catch(() => null);
    }

    if (token) {
      await apiRequest("/api/mobile/auth/logout", { method: "POST", token }).catch(() => null);
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setExpoPushToken(null);
  }, [expoPushToken, token]);

  const refreshMe = useCallback(async () => {
    const storedToken = token ?? (await SecureStore.getItemAsync(TOKEN_KEY));

    if (!storedToken) {
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const payload = await apiRequest<{ user: User }>("/api/mobile/auth/me", { token: storedToken });
      setToken(storedToken);
      setUser(payload.user);
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    refreshMe().finally(() => setIsLoading(false));
  }, [refreshMe]);

  useEffect(() => {
    if (!token || !user || expoPushToken) {
      return;
    }

    const currentToken = token;
    let cancelled = false;

    async function registerPush() {
      const payload = await apiRequest<{ preferences: NotificationPreference }>("/api/mobile/notification-preferences", { token: currentToken });
      const result = await registerForPushNotifications(currentToken, payload.preferences);

      if (!cancelled && result.token) {
        setExpoPushToken(result.token);
      }
    }

    registerPush().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [expoPushToken, token, user]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const payload = await apiRequest<{ token: string; user: User }>("/api/mobile/auth/login", {
        method: "POST",
        body: { email, password }
      });
      await applySession(payload.token, payload.user);
    },
    [applySession]
  );

  const signUp = useCallback(
    async (input: { name: string; username: string; email: string; password: string }) => {
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: input
      });
      await signIn(input.email, input.password);
    },
    [signIn]
  );

  const value = useMemo(
    () => ({ token, user, isLoading, signIn, signUp, signOut, refreshMe }),
    [token, user, isLoading, signIn, signUp, signOut, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
