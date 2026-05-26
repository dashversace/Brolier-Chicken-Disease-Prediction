import { useEffect, useMemo, useState } from 'react'

interface CaseRecord {
  id: number
  code: string
  flock: string
  disease: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Open' | 'Monitoring' | 'Escalated' | 'Resolved'
  owner: string
  reportedAt: string
  notes: string
}

interface CaseFormState {
  flock: string
  disease: string
  priority: CaseRecord['priority']
  status: CaseRecord['status']
  owner: string
  notes: string
}

interface CaseActionModalState {
  type: 'resolve' | 'delete'
  record: CaseRecord
}

interface ToastState {
  text: string
  tone: 'success' | 'error'
}

const initialCases: CaseRecord[] = [
  {
    id: 1,
    code: 'CASE-001',
    flock: 'Batch A - 500 birds',
    disease: 'Newcastle disease suspicion',
    priority: 'High',
    status: 'Escalated',
    owner: 'Dr. Moyo',
    reportedAt: 'Today, 08:40',
    notes: 'Respiratory symptoms and drop in feed intake observed.',
  },
  {
    id: 2,
    code: 'CASE-002',
    flock: 'Layer Unit C',
    disease: 'Respiratory distress review',
    priority: 'Medium',
    status: 'Monitoring',
    owner: 'Panashe',
    reportedAt: 'Today, 07:25',
    notes: 'Waiting for image comparison and vet review.',
  },
  {
    id: 3,
    code: 'CASE-003',
    flock: 'Block D',
    disease: 'High mortality alert',
    priority: 'High',
    status: 'Open',
    owner: 'Dr. Dube',
    reportedAt: 'Yesterday',
    notes: 'Mortality exceeded expected threshold in the finisher house.',
  },
]

const emptyCaseForm: CaseFormState = {
  flock: '',
  disease: '',
  priority: 'Medium',
  status: 'Open',
  owner: '',
  notes: '',
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>(initialCases)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | CaseRecord['status']>('All')
  const [priorityFilter, setPriorityFilter] = useState<'All' | CaseRecord['priority']>('All')
  const [message, setMessage] = useState<ToastState | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCaseId, setEditingCaseId] = useState<number | null>(null)
  const [caseForm, setCaseForm] = useState<CaseFormState>(emptyCaseForm)
  const [actionModal, setActionModal] = useState<CaseActionModalState | null>(null)

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(null), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  const filteredCases = useMemo(() => {
    return cases.filter((record) => {
      const searchMatch =
        search.trim() === ''
          ? true
          : `${record.code} ${record.flock} ${record.disease} ${record.owner}`.toLowerCase().includes(search.toLowerCase())
      const statusMatch = statusFilter === 'All' ? true : record.status === statusFilter
      const priorityMatch = priorityFilter === 'All' ? true : record.priority === priorityFilter
      return searchMatch && statusMatch && priorityMatch
    })
  }, [cases, priorityFilter, search, statusFilter])

  const minimumVisibleRows = 18
  const emptyRows = Math.max(minimumVisibleRows - filteredCases.length, 0)
  const openCount = cases.filter((record) => record.status !== 'Resolved').length

  const openCreateModal = () => {
    setEditingCaseId(null)
    setCaseForm(emptyCaseForm)
    setIsFormModalOpen(true)
  }

  const openEditModal = (record: CaseRecord) => {
    setEditingCaseId(record.id)
    setCaseForm({
      flock: record.flock,
      disease: record.disease,
      priority: record.priority,
      status: record.status,
      owner: record.owner,
      notes: record.notes,
    })
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setEditingCaseId(null)
    setCaseForm(emptyCaseForm)
    setIsFormModalOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCaseForm((current) => ({ ...current, [name]: value }))
  }

  const handleSaveCase = (e: React.FormEvent) => {
    e.preventDefault()

    if (!caseForm.flock || !caseForm.disease || !caseForm.owner || !caseForm.notes) {
      setMessage({ text: 'Please complete all case fields before saving.', tone: 'error' })
      return
    }

    const payload: CaseRecord = {
      id: editingCaseId ?? Date.now(),
      code: editingCaseId ? cases.find((record) => record.id === editingCaseId)?.code ?? `CASE-${Date.now()}` : `CASE-${String(cases.length + 1).padStart(3, '0')}`,
      flock: caseForm.flock,
      disease: caseForm.disease,
      priority: caseForm.priority,
      status: caseForm.status,
      owner: caseForm.owner,
      reportedAt: 'Just now',
      notes: caseForm.notes,
    }

    if (editingCaseId) {
      setCases((current) => current.map((record) => (record.id === editingCaseId ? payload : record)))
      setMessage({ text: `${payload.code} updated successfully.`, tone: 'success' })
    } else {
      setCases((current) => [payload, ...current])
      setMessage({ text: `${payload.code} created successfully.`, tone: 'success' })
    }

    closeFormModal()
  }

  const handleConfirmAction = () => {
    if (!actionModal) return

    if (actionModal.type === 'delete') {
      setCases((current) => current.filter((record) => record.id !== actionModal.record.id))
      setMessage({ text: `${actionModal.record.code} deleted.`, tone: 'success' })
    } else {
      setCases((current) =>
        current.map((record) =>
          record.id === actionModal.record.id ? { ...record, status: 'Resolved', reportedAt: 'Just now' } : record,
        ),
      )
      setMessage({ text: `${actionModal.record.code} marked as resolved.`, tone: 'success' })
    }

    setActionModal(null)
  }

  return (
    <section className="page-layout flocks-page">
      {message && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          <div className={`toast-notice toast-${message.tone}`}>
            <span>{message.text}</span>
            <button type="button" className="toast-close" onClick={() => setMessage(null)} aria-label="Dismiss notification">
              X
            </button>
          </div>
        </div>
      )}

      <div className="registry-header">
        <div className="registry-heading">
          <h1 className="registry-title">Cases</h1>
          <span className="registry-count">{openCount.toLocaleString()} active cases</span>
        </div>
        <button type="button" className="settings-btn" onClick={openCreateModal}>
          <ActionIcon name="plus" />
          Add case
        </button>
      </div>

      <section className="registry-panel">
        <div className="registry-toolbar">
          <div className="registry-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input registry-search"
              placeholder="Search cases"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | CaseRecord['status'])}>
              <option value="All">All status</option>
              <option value="Open">Open</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'All' | CaseRecord['priority'])}>
              <option value="All">All priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        <div className="registry-table-wrap">
          <table className="flock-table cases-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Flock</th>
                <th>Disease</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Reported</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length > 0 ? (
                <>
                  {filteredCases.map((record) => (
                    <tr key={record.id}>
                      <td>{record.code}</td>
                      <td>{record.flock}</td>
                      <td>{record.disease}</td>
                      <td>
                        <span className={`chip registry-chip case-priority-${record.priority.toLowerCase()}`}>{record.priority}</span>
                      </td>
                      <td>
                        <span className={`chip registry-chip case-status-${record.status.toLowerCase().replace(/\s+/g, '-')}`}>{record.status}</span>
                      </td>
                      <td>{record.owner}</td>
                      <td>{record.reportedAt}</td>
                      <td>{record.notes}</td>
                      <td>
                        <div className="table-actions compact-actions">
                          <button type="button" className="icon-action-btn" onClick={() => openEditModal(record)} title="Edit case" aria-label={`Edit ${record.code}`}>
                            <ActionIcon name="edit" />
                          </button>
                          {record.status !== 'Resolved' && (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => setActionModal({ type: 'resolve', record })}
                              title="Resolve case"
                              aria-label={`Resolve ${record.code}`}
                            >
                              <ActionIcon name="resolve" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-action-btn danger-icon-btn"
                            onClick={() => setActionModal({ type: 'delete', record })}
                            title="Delete case"
                            aria-label={`Delete ${record.code}`}
                          >
                            <ActionIcon name="delete" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: emptyRows }).map((_, index) => (
                    <tr key={`empty-case-row-${index}`} className="empty-grid-row" aria-hidden="true">
                      <td colSpan={9} />
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-table-state">
                      <div className="empty-watermark" aria-hidden="true">
                        CASES
                      </div>
                      <div className="empty-table-copy">No cases match the current filters.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="registry-footer">
          <button type="button" className="pager-btn">
            Previous
          </button>
          <div className="pager-pages">
            <button type="button" className="pager-page active">
              1
            </button>
            <button type="button" className="pager-page">
              2
            </button>
            <button type="button" className="pager-page">
              3
            </button>
            <span className="pager-dots">...</span>
            <button type="button" className="pager-page">
              6
            </button>
          </div>
          <button type="button" className="pager-btn">
            Next
          </button>
        </div>
      </section>

      {isFormModalOpen && (
        <div className="modal-backdrop" onClick={closeFormModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editingCaseId ? 'Edit Case' : 'Create New Case'}</h2>
                <p>Track disease investigations, flock assignments, and follow-up notes.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeFormModal}>X</button>
            </div>

            <form className="modal-form-shell" onSubmit={handleSaveCase}>
              <div className="modal-body modal-body-scroll">
                <div className="flock-form modal-form">
                  <label><span>Flock</span><input name="flock" value={caseForm.flock} onChange={handleInputChange} placeholder="Batch A - 500 birds" /></label>
                  <label><span>Disease / issue</span><input name="disease" value={caseForm.disease} onChange={handleInputChange} placeholder="Newcastle disease suspicion" /></label>
                  <label>
                    <span>Priority</span>
                    <select name="priority" value={caseForm.priority} onChange={handleInputChange}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select name="status" value={caseForm.status} onChange={handleInputChange}>
                      <option value="Open">Open</option>
                      <option value="Monitoring">Monitoring</option>
                      <option value="Escalated">Escalated</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </label>
                  <label><span>Assigned to</span><input name="owner" value={caseForm.owner} onChange={handleInputChange} placeholder="Dr. Moyo" /></label>
                  <label className="case-form-wide">
                    <span>Notes</span>
                    <textarea name="notes" value={caseForm.notes} onChange={handleInputChange} placeholder="Add case observations and follow-up details." />
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn modal-btn" onClick={closeFormModal}>Cancel</button>
                <button type="submit" className="primary-btn modal-btn">{editingCaseId ? 'Update case' : 'Create case'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="modal-backdrop" onClick={() => setActionModal(null)}>
          <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{actionModal.type === 'delete' ? 'Delete Case' : 'Resolve Case'}</h2>
                <p>{actionModal.record.code}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setActionModal(null)}>X</button>
            </div>

            <div className="modal-body modal-body-scroll">
              <p className="modal-copy">
                {actionModal.type === 'delete'
                  ? 'This action will permanently remove the case from the register.'
                  : 'This case will be marked as resolved and moved out of the active review flow.'}
              </p>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                type="button"
                className={`primary-btn modal-btn ${actionModal.type === 'delete' ? 'danger-solid-btn' : ''}`}
                onClick={handleConfirmAction}
              >
                {actionModal.type === 'delete' ? 'Delete case' : 'Resolve case'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ActionIcon({ name }: { name: 'edit' | 'delete' | 'plus' | 'resolve' }) {
  const paths: Record<typeof name, string> = {
    edit: 'M4 20h4l10-10-4-4L4 16v4zm12-12 4 4M14 6l4 4',
    delete: 'M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12M10 11v5M14 11v5',
    plus: 'M12 5v14M5 12h14',
    resolve: 'M5 12l4 4L19 6',
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
