"use client"

import { useState } from "react"
import { Check, Copy, Linkedin, Facebook, Twitter } from "lucide-react"

interface ShareButtonsProps {
  title: string
  url: string
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encodedTitle = encodeURIComponent(title)
  const encodedUrl = encodeURIComponent(url)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const textarea = document.createElement("textarea")
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareLinks = [
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: <Twitter className="w-3.5 h-3.5" />,
      color: "hover:text-white hover:bg-gray-700",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook className="w-3.5 h-3.5" />,
      color: "hover:text-blue-400 hover:bg-blue-500/10",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <Linkedin className="w-3.5 h-3.5" />,
      color: "hover:text-sky-400 hover:bg-sky-500/10",
    },
  ]

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-gray-600 mr-1 uppercase tracking-wider">Share</span>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-1.5 rounded-md text-gray-500 transition-all ${link.color}`}
          title={`${link.name}에 공유`}
        >
          {link.icon}
        </a>
      ))}
      <button
        onClick={handleCopy}
        className={`p-1.5 rounded-md transition-all ${
          copied 
            ? "text-green-400 bg-green-500/10" 
            : "text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10"
        }`}
        title="링크 복사"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
