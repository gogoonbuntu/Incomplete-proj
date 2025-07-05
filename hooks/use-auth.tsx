"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { User } from "firebase/auth"

// Firebase 연결 문제로 인해 빈 구현 제공
interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean // 모든 사용자에게 관리자 권한 부여
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

// 기본값을 제공하는 컨텍스트 생성
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  isAdmin: true, // 개발 모드에서 항상 관리자로 설정
  signIn: async () => { console.log('로그인 기능 비활성화됨') },
  signOut: async () => { console.log('로그아웃 기능 비활성화됨') }
})

export function AuthProvider({ children }: { children: ReactNode }) {
  // 빈 구현 - Firebase 연결 없이 작동
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  
  const signIn = async () => {
    console.log('로그인 기능이 비활성화되었습니다')
  }
  
  const signOut = async () => {
    console.log('로그아웃 기능이 비활성화되었습니다')
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: true, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
