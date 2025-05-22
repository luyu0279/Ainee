"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { UserInfoResponse } from "@/apis/models/UserInfoResponse";
import ApiLibs from "@/lib/ApiLibs";
import { ResponseCode } from "@/apis/models/ResponseCode";

interface AuthContextType {
  user: User | null;
  userInfo: UserInfoResponse | null;
  loading: boolean;
  updateUserInfo: (info: UserInfoResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userInfo: null,
  loading: true,
  updateUserInfo: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Helper function to dispatch login/logout events
const dispatchLoginEvent = (isLoggedIn: boolean, userInfo: UserInfoResponse | null = null) => {
  console.log("dispatchLoginEvent", isLoggedIn, userInfo);
  if (typeof window !== 'undefined') {
    const eventName = isLoggedIn ? 'aineeLoginSuccess' : 'aineeLogout';
    const event = new CustomEvent(eventName, {
      detail: {
        userInfo,
        token: localStorage.getItem('ainee_token'),
      }
    });
    window.dispatchEvent(event);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUserInfo = (info: UserInfoResponse) => {
    setUserInfo(info);
    // Notify extension about login
    dispatchLoginEvent(true, info);
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserInfo(null);
      localStorage.removeItem('ainee_token');
      // Notify extension about logout
      dispatchLoginEvent(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('ainee_token');
    if (token) {
      // Try to get user info if we have a token
      ApiLibs.user.getUserApiUserGetGet()
        .then((response) => {
          if (response.code === ResponseCode.SUCCESS && response.data) {
            setUserInfo(response.data);
            // Notify extension about login
            dispatchLoginEvent(true, response.data);
          } else {
            // If the token is invalid, remove it
            localStorage.removeItem('ainee_token');
            // Notify extension about logout
            dispatchLoginEvent(false);
          }
        })
        .catch(() => {
          localStorage.removeItem('ainee_token');
          // Notify extension about logout
          dispatchLoginEvent(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
      // Notify extension about logout state
      dispatchLoginEvent(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userInfo, loading, updateUserInfo, logout }}>
      {children}
    </AuthContext.Provider>
  );
} 