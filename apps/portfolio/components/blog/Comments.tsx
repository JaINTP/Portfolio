'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    remark_config: any;
    REMARK42: any;
  }
}

export default function Comments() {
  const pathname = usePathname()
  const remarkUrl = process.env.NEXT_PUBLIC_REMARK_URL || 'https://comments.jaintp.com'
  const siteId = process.env.NEXT_PUBLIC_REMARK_SITE_ID || 'jaintp-portfolio'

  useEffect(() => {
    // Reset Remark42 on route change
    if (window.REMARK42) {
      window.REMARK42.destroy()
    }

    window.remark_config = {
      host: remarkUrl,
      site_id: siteId,
      url: window.location.origin + pathname,
      components: ['embed'],
      max_shown_comments: 10,
      theme: 'dark',
      locale: 'en',
      show_email_subscription: false,
    }

    const script = document.createElement('script')
    script.src = `${remarkUrl}/web/embed.js`
    script.async = true
    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      if (window.REMARK42) {
        window.REMARK42.destroy()
      }
    }
  }, [pathname, remarkUrl, siteId])

  return (
    <div className="mt-16 pt-8 border-t border-white/10">
      <div id="remark42" className="remark42"></div>
    </div>
  )
}
