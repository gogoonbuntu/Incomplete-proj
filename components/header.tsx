"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Github, User, Bookmark, LogOut, Settings, Languages, Globe } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/hooks/use-language"

export function Header() {
  const { user, loading, signIn, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  const languages = [
    { code: "ko", label: "한국어" },
    { code: "en", label: "English" },
    { code: "zh", label: "中文" },
  ] as const

  return (
    <header className="glass-panel border-none sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-md opacity-0 group-hover:opacity-50 transition-opacity" />
              <Github className="h-8 w-8 text-white relative z-10 group-hover:text-cyan-400 transition-colors" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase group-hover:text-glow transition-all">
              {t('title')}
            </span>
          </Link>

          <div className="flex items-center space-x-2 md:space-x-6">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400 hover:bg-white/5">
                  <Languages className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{languages.find(l => l.code === language)?.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`focus:bg-cyan-500/20 focus:text-cyan-400 ${language === lang.code ? 'text-cyan-400 bg-cyan-500/10' : ''}`}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white hover:text-glow transition-all uppercase tracking-widest">
                HOME
              </Link>
              <Link href="/blog" className="text-sm font-medium text-gray-400 hover:text-white hover:text-glow transition-all uppercase tracking-widest">
                BLOG
              </Link>
              {user && (
                <Link href="/bookmarks" className="text-sm font-medium text-gray-400 hover:text-white hover:text-glow transition-all uppercase tracking-widest">
                  STATIONED
                </Link>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="w-8 h-8 bg-white/5 rounded-full animate-pulse"></div>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-white/10 hover:border-cyan-500/50 p-0 overflow-hidden transition-all">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                        <AvatarFallback className="bg-cyan-950 text-cyan-400">
                          {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-black/90 backdrop-blur-2xl border-white/10 text-white" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-3 border-b border-white/5">
                      <div className="flex flex-col space-y-1 leading-none">
                        {user.displayName && <p className="font-bold text-cyan-400">{user.displayName}</p>}
                        {user.email && <p className="w-[180px] truncate text-xs text-gray-500">{user.email}</p>}
                      </div>
                    </div>
                    <DropdownMenuItem asChild className="focus:bg-white/5 focus:text-white">
                      <Link href="/bookmarks" className="flex items-center p-2 cursor-pointer">
                        <Bookmark className="mr-2 h-4 w-4 text-purple-400" />
                        <span>Bookmarked Systems</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut} className="focus:bg-red-500/10 focus:text-red-400 text-red-500/80">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Terminate Link</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={signIn} className="bg-white text-black hover:bg-cyan-400 hover:text-black font-bold transition-all px-6">
                  UPLINK
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
