"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "firebase/auth"
import { firebaseServicePromise } from '@/lib/services/firebase-service';

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    firebaseServicePromise.then(firebaseService => {
      unsubscribe = firebaseService.onAuthStateChanged((user: any) => {
        setUser(user);
        setLoading(false);
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [])

  const signIn = async () => {
    try {
      setLoading(true)
      const firebaseService = await firebaseServicePromise;
      await firebaseService.signInWithGoogle();
    } catch (error) {
      console.error("Failed to sign in:", error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const firebaseService = await firebaseServicePromise;
      await firebaseService.signOut();
    } catch (error) {
      console.error("Failed to sign out:", error)
    } finally {
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
