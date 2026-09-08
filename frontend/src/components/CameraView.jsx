import React, { useState } from 'react'
import { getCameraSnapshotUrl, getCameraStreamUrl } from '../api'

export default function CameraView({ cameras, token, onCommand, onAddCamera }) {
  const [selectedCam, setSelectedCam] = useState(null)
  const [snapshotPreview, setSnapshotPreview] = useState(null)
  const [reloadKey, setReloadKey] = useState(Date.now())

  const handleRefresh = () => {
    setReloadKey(Date.now())
  }

  const handleSnapshotDownload = (cam) => {
    const url = getCameraSnapshotUrl(cam.id, token)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cam.name.replace(/\s+/g, '_')}_snapshot_${Date.now()}.svg`
    a.click()
  }

  if (!cameras || cameras.length === 0) {
    return (
      <div className="empty-state-view">
        <div className="empty-icon">📹</div>
        <h3>No Security Cameras Connected</h3>
        <p>Add your RTSP, ONVIF, or Smart Cloud cameras to monitor your home live.</p>
        <button className="btn btn-primary" onClick={onAddCamera}>+ Add Security Camera</button>
      </div>
    )
  }

  return (
    <div className="cameras-tab-container">
      <div className="section-header-row">
        <div>
          <h2>Home Security Feeds</h2>
          <span className="section-subtitle">{cameras.length} active live cameras</span>
        </div>
        <button className="btn btn-sm btn-outline" onClick={handleRefresh}>
          🔄 Refresh Feeds
        </button>
      </div>

      {/* Multi-camera Grid */}
      <div className="camera-grid">
        {cameras.map((cam) => {
          const s = cam.state || {}
          const isOnline = s.online !== false
          const streamUrl = getCameraStreamUrl(cam.id, token) + `&r=${reloadKey}`

          return (
            <div key={cam.id} className="camera-card">
              <div className="camera-video-wrapper" onClick={() => setSelectedCam(cam)}>
                {isOnline ? (
                  <img
                    src={streamUrl}
                    alt={cam.name}
                    className="camera-video-feed"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}

                <div className={`camera-offline-placeholder ${!isOnline ? 'visible' : ''}`}>
                  <span>⚠️ Camera Signal Offline</span>
                  <button
                    className="btn btn-sm btn-outline mt-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRefresh()
                    }}
                  >
                    Retry
                  </button>
                </div>

                <div className="camera-overlay-badge top-left">
                  <span className={`live-indicator ${s.recording ? 'rec' : ''}`}>
                    {s.recording ? '● REC' : 'LIVE'}
                  </span>
                </div>

                <div className="camera-overlay-badge top-right">
                  <span className="cam-quality-tag">{s.resolution || '1080p HD'}</span>
                </div>

                <div className="camera-overlay-badge bottom-left">
                  <span className="cam-title-tag">{cam.name} ({cam.room})</span>
                </div>

                <div className="camera-hover-expand">
                  <span>⤢ Tap to expand</span>
                </div>
              </div>

              <div className="camera-controls-bar">
                <button
                  className="cam-tool-btn"
                  title="Capture Snapshot"
                  onClick={() => handleSnapshotDownload(cam)}
                >
                  📷 Snapshot
                </button>
                <button
                  className={`cam-tool-btn ${s.nightVision ? 'active' : ''}`}
                  title="Night Vision"
                  onClick={() => onCommand(cam.id, 'toggleNightVision')}
                >
                  🌙 {s.nightVision ? 'Night IR On' : 'Day Mode'}
                </button>
                <button
                  className="cam-tool-btn"
                  title="Full Screen View"
                  onClick={() => setSelectedCam(cam)}
                >
                  ⤢ Fullscreen
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full-Screen Camera Modal */}
      {selectedCam && (
        <div className="modal-backdrop" onClick={() => setSelectedCam(null)}>
          <div className="camera-fullscreen-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cam-fullscreen-header">
              <div>
                <h3>{selectedCam.name}</h3>
                <span className="fs-cam-sub">{selectedCam.room} • {selectedCam.brand || 'Domi HD'}</span>
              </div>
              <button className="icon-btn close-btn" onClick={() => setSelectedCam(null)}>×</button>
            </div>

            <div className="cam-fullscreen-video-box">
              <img
                src={getCameraStreamUrl(selectedCam.id, token) + `&r=${reloadKey}`}
                alt={selectedCam.name}
                className="cam-fs-image"
              />
            </div>

            <div className="cam-fullscreen-footer">
              <button
                className="btn btn-outline"
                onClick={() => handleSnapshotDownload(selectedCam)}
              >
                📸 Save Snapshot
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onCommand(selectedCam.id, 'toggleNightVision')}
              >
                🌙 Toggle Night Vision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
