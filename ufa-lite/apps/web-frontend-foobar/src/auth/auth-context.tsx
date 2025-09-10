import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getTransactionApiBase } from "../env-vars";

interface AuthContextType {
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const checkAdminStatus = async (bearer: string | null) => {
    setAdminLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (bearer) headers.Authorization = `Bearer ${bearer}`;

      const API_BASE = getTransactionApiBase();
      const response = await fetch(`${API_BASE}/auth/admin-status`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Failed to check admin status:", error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    setToken(t);
    setLoading(false);
    checkAdminStatus(t);
  }, []);

  const signOut = async () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ token, loading, isAdmin, adminLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
