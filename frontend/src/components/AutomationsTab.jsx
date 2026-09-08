import React, { useState } from 'react'

export default function AutomationsTab({ automations, devices, onAddAutomation, onDeleteAutomation, onToggleAutomation }) {
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('time')
  const [triggerTime, setTriggerTime] = useState('19:00')
  const [triggerDevice, setTriggerDevice] = useState(devices[0]?.id || '')
  const [thresholdTemp, setThresholdTemp] = useState('25')
  const [tempOperator, setTempOperator] = useState('>=')
  const [actionDevice, setActionDevice] = useState(devices[0]?.id || '')
  const [actionCommand, setActionCommand] = useState('turn_on')
  const [actionTemp, setActionTemp] = useState('22')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    let trigger = {}
    if (triggerType === 'time') {
      trigger = { type: 'time', time: triggerTime }
    } else if (triggerType === 'temperature') {
      trigger = {
        type: 'temperature',
        device_id: triggerDevice,
        threshold: Number(thresholdTemp),
        operator: tempOperator,
      }
    }

    let action = {
      device_id: actionDevice,
      command: actionCommand,
      params: actionCommand === 'set_temp' ? { temp: Number(actionTemp) } : {},
    }

    try {
      await onAddAutomation({
        name: name.trim(),
        enabled: true,
        trigger,
        action,
      })
      setShowModal(false)
      setName('')
    } finally {
      setSaving(false)
    }
  }

  const acDevices = devices.filter((d) => d.type === 'ac')

  return (
    <div className="automations-tab-container">
      <div className="section-header-row">
        <div>
          <h2>Smart Automations</h2>
          <span className="section-subtitle">Auto-triggers for comfort & energy saving</span>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
          + Create Rule
        </button>
      </div>

      <div className="automations-list">
        {automations.map((auto) => {
          const trigger = auto.trigger || {}
          const action = auto.action || {}
          const targetDev = devices.find((d) => d.id === action.device_id)

          let triggerSummary = ''
          if (trigger.type === 'time') {
            triggerSummary = `⏰ Every day at ${trigger.time}`
          } else if (trigger.type === 'temperature') {
            triggerSummary = `🌡️ When Temp ${trigger.operator} ${trigger.threshold}°C`
          } else {
            triggerSummary = 'Custom trigger'
          }

          let actionSummary = ''
          if (action.command === 'turn_on') actionSummary = `Turn ON ${targetDev?.name || 'Device'}`
          else if (action.command === 'turn_off') actionSummary = `Turn OFF ${targetDev?.name || 'Device'}`
          else if (action.command === 'set_temp') actionSummary = `Set ${targetDev?.name || 'AC'} to ${action.params?.temp}°C`
          else actionSummary = `${action.command} on ${targetDev?.name || 'Device'}`

          return (
            <div key={auto.id} className={`automation-card ${auto.enabled ? 'active' : 'disabled'}`}>
              <div className="auto-card-left">
                <div className="auto-icon">⚡</div>
                <div>
                  <div className="auto-name">{auto.name}</div>
                  <div className="auto-rule-text">
                    <span className="rule-badge trigger">{triggerSummary}</span>
                    <span className="rule-arrow">➔</span>
                    <span className="rule-badge action">{actionSummary}</span>
                  </div>
                </div>
              </div>

              <div className="auto-card-right">
                <button
                  className={`toggle-switch ${auto.enabled ? 'checked' : ''}`}
                  onClick={() => onToggleAutomation(auto.id)}
                  title={auto.enabled ? 'Disable rule' : 'Enable rule'}
                >
                  <span className="toggle-slider" />
                </button>
                <button
                  className="icon-btn delete"
                  onClick={() => onDeleteAutomation(auto.id)}
                  title="Delete rule"
                >
                  ×
                </button>
              </div>
            </div>
          )
        })}

        {automations.length === 0 && (
          <div className="empty-state-view">
            <div className="empty-icon">⚡</div>
            <h3>No Automations Created</h3>
            <p>Set up rules like "Turn on AC at 7 PM" or "Turn off TV at midnight".</p>
          </div>
        )}
      </div>

      {/* Add Automation Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Automation Rule</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate}>
              <label>
                Automation Name
                <input
                  type="text"
                  placeholder="e.g. Evening Cooling Routine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <fieldset className="form-fieldset">
                <legend>IF (Trigger Condition)</legend>
                <label>
                  Trigger Type
                  <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                    <option value="time">Scheduled Time</option>
                    <option value="temperature">Temperature Threshold</option>
                  </select>
                </label>

                {triggerType === 'time' ? (
                  <label>
                    Time (24h format)
                    <input
                      type="time"
                      value={triggerTime}
                      onChange={(e) => setTriggerTime(e.target.value)}
                      required
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Sensor Device
                      <select value={triggerDevice} onChange={(e) => setTriggerDevice(e.target.value)}>
                        {acDevices.map((d) => (
                          <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                        ))}
                      </select>
                    </label>
                    <div className="form-row">
                      <label>
                        Condition
                        <select value={tempOperator} onChange={(e) => setTempOperator(e.target.value)}>
                          <option value=">=">&gt;= (Greater or equal)</option>
                          <option value="<=">&lt;= (Less or equal)</option>
                        </select>
                      </label>
                      <label>
                        Threshold (°C)
                        <input
                          type="number"
                          value={thresholdTemp}
                          onChange={(e) => setThresholdTemp(e.target.value)}
                          min="16"
                          max="35"
                        />
                      </label>
                    </div>
                  </>
                )}
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>THEN (Device Action)</legend>
                <label>
                  Target Device
                  <select value={actionDevice} onChange={(e) => setActionDevice(e.target.value)}>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                    ))}
                  </select>
                </label>

                <label>
                  Action Command
                  <select value={actionCommand} onChange={(e) => setActionCommand(e.target.value)}>
                    <option value="turn_on">Turn Device ON</option>
                    <option value="turn_off">Turn Device OFF</option>
                    <option value="set_temp">Set Temperature (AC)</option>
                    <option value="toggle">Toggle Power</option>
                  </select>
                </label>

                {actionCommand === 'set_temp' && (
                  <label>
                    Target Temperature (°C)
                    <input
                      type="number"
                      value={actionTemp}
                      onChange={(e) => setActionTemp(e.target.value)}
                      min="16"
                      max="30"
                    />
                  </label>
                )}
              </fieldset>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Save Automation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
