import { useEffect, useState } from 'react'

interface SettingsToast {
  text: string
  tone: 'success' | 'error'
}

interface PasswordFormState {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const initialPasswordForm: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function SettingsPage() {
  const [form, setForm] = useState<PasswordFormState>(initialPasswordForm)
  const [toast, setToast] = useState<SettingsToast | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setToast({ text: 'Please complete all password fields.', tone: 'error' })
      return
    }

    if (form.newPassword.length < 8) {
      setToast({ text: 'New password must be at least 8 characters long.', tone: 'error' })
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setToast({ text: 'New password and confirmation do not match.', tone: 'error' })
      return
    }

    setForm(initialPasswordForm)
    setToast({ text: 'Password changed successfully.', tone: 'success' })
  }

  return (
    <section className="page-layout settings-page">
      {toast && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <div className={`toast-notice toast-${toast.tone}`}>
            <span>{toast.text}</span>
            <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss notification">
              X
            </button>
          </div>
        </div>
      )}

      <div className="registry-header">
        <div className="registry-heading">
          <h1 className="registry-title">Settings</h1>
          <span className="registry-count">change password</span>
        </div>
      </div>

      <section className="settings-grid settings-grid-single">
        <article className="chart-card settings-card">
          <div className="chart-title">Change Password</div>
          <form className="settings-form-grid" onSubmit={handleSubmit}>
            <label className="modal-field">
              <span>Current password</span>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleInputChange}
                placeholder="Enter current password"
              />
            </label>

            <label className="modal-field">
              <span>New password</span>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
              />
            </label>

            <label className="modal-field">
              <span>Confirm new password</span>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
              />
            </label>

            <div className="settings-note">
              Use at least 8 characters and confirm the new password before saving the change.
            </div>

            <div className="settings-header-actions">
              <button
                type="button"
                className="ghost-btn settings-page-btn"
                onClick={() => setForm(initialPasswordForm)}
              >
                Clear
              </button>
              <button type="submit" className="settings-btn">
                Update password
              </button>
            </div>
          </form>
        </article>
      </section>
    </section>
  )
}
