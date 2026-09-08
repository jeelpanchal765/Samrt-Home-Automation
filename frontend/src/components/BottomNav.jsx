import React from 'react'

export default function BottomNav({ currentTab, onChangeTab, onAddDevice }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'remotes', label: 'Remotes', icon: '🎮' },
    { id: 'add', isFab: true },
    { id: 'cameras', label: 'Cameras', icon: '📹' },
    { id: 'automations', label: 'Automate', icon: '⚡' },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        if (tab.isFab) {
          return (
            <button
              key="fab"
              className="fab-add-btn"
              onClick={onAddDevice}
              aria-label="Add Device"
              title="Add Device"
            >
              <span className="fab-plus">+</span>
            </button>
          )
        }

        const isActive = currentTab === tab.id
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChangeTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
