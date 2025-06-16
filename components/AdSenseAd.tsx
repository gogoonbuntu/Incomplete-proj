'use client'

import { useEffect } from 'react'

type AdSenseAdProps = {
  slot: string
  format?: string
  responsive?: boolean
  style?: React.CSSProperties
  className?: string
}

export function AdSenseAd({
  slot,
  format = 'auto',
  responsive = true,
  style = { display: 'block' },
  className = '',
}: AdSenseAdProps) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error('AdSense push error:', e)
    }
  }, [])

  if (!process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT) {
    console.warn('AdSense client ID is not set')
    return null
  }

  return (
    <div className={`adsense-ad ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      />
    </div>
  )
}
