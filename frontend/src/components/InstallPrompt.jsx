import React, { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setIsStandalone(inStandalone)
    if (inStandalone) return

    // iOS detection
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    setIsIOS(isIosDevice)

    // Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  if (isStandalone || (!showPrompt && !isIOS)) {
    return null
  }

  return (
    <div className="install-banner">
      <div className="install-info">
        <div className="install-icon">
          <img src="/icons/icon-192.svg" alt="Domi" width="36" height="36" />
        </div>
        <div>
          <div className="install-title">Install Domi Remote</div>
          <div className="install-sub">Use on your Android phone like a native app</div>
        </div>
      </div>

      {showPrompt && (
        <div className="install-actions">
          <button className="btn btn-sm btn-outline" onClick={() => setShowPrompt(false)}>Later</button>
          <button className="btn btn-sm btn-primary" onClick={handleInstallClick}>Install</button>
        </div>
      )}

      {isIOS && !showPrompt && (
        <div className="install-ios-tip">
          Tap <span className="ios-share-icon">⎋</span> and select <b>Add to Home Screen</b>
        </div>
      )}
    </div>
  )
}
