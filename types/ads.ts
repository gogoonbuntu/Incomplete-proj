declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export interface AdConfig {
  enabled: boolean
  adClient: string
  adSlots: {
    home: {
      top: string
      middle: string
      bottom: string
    }
    project: {
      sidebar: string
      bottom: string
    }
    bookmarks: string
  }
}

export const defaultAdConfig: AdConfig = {
  enabled: true,
  adClient: "ca-pub-XXXXXXXXXXXXXXXX", // 실제 AdSense 클라이언트 ID로 교체 필요
  adSlots: {
    home: {
      top: "1234567890",
      middle: "2345678901",
      bottom: "3456789012",
    },
    project: {
      sidebar: "4567890123",
      bottom: "5678901234",
    },
    bookmarks: "6789012345",
  },
}
