import React from 'react'

export default function TopBar({ user, gatewayOnline, onOpenGateway, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-logo">
          <img src="/icons/icon-192.svg" alt="Domi" className="brand-icon" />
          <div>
            <div className="brand-name">DOMI<span>HOME</span></div>
            <div className="brand-status">
              <span className="status-dot live" /> Cloud Live
            </div>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <button
          className={`gateway-badge ${gatewayOnline ? 'online' : 'offline'}`}
          onClick={onOpenGateway}
          title="Home Gateway Status"
        >
          <span className="gw-dot" />
          <span className="gw-text">{gatewayOnline ? 'LAN Gateway' : 'Cloud Direct'}</span>
        </button>

        {user?.picture ? (
          <img src={user.picture} alt="" className="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
        )}

        <button className="icon-btn logout-btn" onClick={onLogout} title="Sign Out">
          ⎋
        </button>
      </div>
    </header>
  )
}
