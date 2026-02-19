"use client"

import React, { useEffect, useRef } from 'react'

export const GalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let stars: Star[] = []
    const starCount = 1500
    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0
    let scrollY = 0

    class Star {
      x: number
      y: number
      z: number
      px: number
      py: number
      size: number
      color: string

      constructor() {
        this.init()
      }

      init() {
        this.x = (Math.random() - 0.5) * 2000
        this.y = (Math.random() - 0.5) * 2000
        this.z = Math.random() * 2000
        this.px = 0
        this.py = 0
        this.size = Math.random() * 2 + 0.5
        
        // 은하수 중심부(Cyan/Purple)와 외곽(White) 색상 혼합
        const colorSeed = Math.random()
        if (colorSeed > 0.9) this.color = '#bc13fe' // Pink/Purple
        else if (colorSeed > 0.7) this.color = '#00f3ff' // Cyan
        else this.color = '#ffffff'
      }

      update(width: number, height: number, speed: number) {
        this.z -= speed // 스크롤/기본 속도에 따라 앞으로 다가옴

        if (this.z <= 0) {
          this.init()
          this.z = 2000
        }

        // 3D 투영
        const scale = 600 / this.z
        const x3d = (this.x + (mouseX - width / 2) * 0.2) * scale + width / 2
        const y3d = (this.y + (mouseY - height / 2) * 0.2) * scale + height / 2

        this.px = x3d
        this.py = y3d
      }

      draw(ctx: CanvasRenderingContext2D) {
        const opacity = Math.min(1, (2000 - this.z) / 1000)
        ctx.fillStyle = this.color
        ctx.globalAlpha = opacity
        ctx.beginPath()
        ctx.arc(this.px, this.py, this.size * (600 / this.z), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const init = () => {
      stars = []
      for (let i = 0; i < starCount; i++) {
        stars.push(new Star())
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      init()
    }

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX
      targetMouseY = e.clientY
    }

    const handleScroll = () => {
      scrollY = window.scrollY
    }

    const animate = () => {
      // 마우스 움직임 부드럽게 보정 (Lerp)
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05

      ctx.fillStyle = '#020205'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 중앙 은하핵 글로우 효과
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      )
      gradient.addColorStop(0, 'rgba(20, 10, 60, 0.4)')
      gradient.addColorStop(0.5, 'rgba(10, 5, 30, 0.1)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 스크롤 속도 반영 (전진 효과)
      const baseSpeed = 1
      const scrollSpeed = Math.abs(window.scrollY - scrollY) * 0.1
      const currentSpeed = baseSpeed + scrollSpeed

      stars.forEach(star => {
        star.update(canvas.width, canvas.height, currentSpeed)
        star.draw(ctx)
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll)
    
    resize()
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none"
      style={{ background: '#020205' }}
    />
  )
}
