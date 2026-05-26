import { useEffect, useMemo, useState } from 'react'

interface Flock {
  id: number
  name: string
  size: number
  age: string
  location: string
  farm: string
  stage: string
  status: 'Healthy' | 'Watchlist' | 'Priority'
  archived: boolean
  linkedCases: string[]
  lastCheck: string
}

interface FlockFormState {
  name: string
  size: string
  ageValue: string
  ageUnit: 'days' | 'weeks' | 'months'
  location: string
  farm: string
  stage: 'Starter' | 'Grower' | 'Finisher' | 'Layers' | 'Breeder'
  status: Flock['status']
}

interface ActionModalState {
  type: 'archive' | 'restore' | 'delete'
  flock: Flock
}

interface ToastState {
  text: string
  tone: 'success' | 'error'
}

const initialFlocks: Flock[] = [
  {
    id: 1,
    name: 'Batch A - 500 birds',
    size: 500,
    age: '2 weeks',
    location: 'House 1',
    farm: 'Newcastle North Farm',
    stage: 'Starter',
    status: 'Healthy',
    archived: false,
    linkedCases: ['Possible NCD exposure'],
    lastCheck: 'Today, 08:45',
  },
  {
    id: 2,
    name: 'Layer Unit C',
    size: 1980,
    age: '12 weeks',
    location: 'Unit C',
    farm: 'Green Valley Poultry',
    stage: 'Layers',
    status: 'Watchlist',
    archived: false,
    linkedCases: ['Respiratory distress review'],
    lastCheck: 'Today, 07:10',
  },
  {
    id: 3,
    name: 'Block D',
    size: 2840,
    age: '6 weeks',
    location: 'Block D',
    farm: 'Riverbend Broilers',
    stage: 'Finisher',
    status: 'Priority',
    archived: false,
    linkedCases: ['High mortality alert', 'Feed drop investigation'],
    lastCheck: 'Today, 06:30',
  },
  {
    id: 4,
    name: 'Starter Pen 2',
    size: 1120,
    age: '2 weeks',
    location: 'Pen 2',
    farm: 'Sunrise Layers Unit',
    stage: 'Starter',
    status: 'Healthy',
    archived: true,
    linkedCases: [],
    lastCheck: 'Yesterday',
  },
]

const availableCases = [
  'Possible NCD exposure',
  'Respiratory distress review',
  'High mortality alert',
  'Feed drop investigation',
  'Coccidiosis lab follow-up',
]

const flockStageOptions: FlockFormState['stage'][] = ['Starter', 'Grower', 'Finisher', 'Layers', 'Breeder']
const flockAgeUnits: FlockFormState['ageUnit'][] = ['days', 'weeks', 'months']

const emptyFlockForm: FlockFormState = {
  name: '',
  size: '',
  ageValue: '',
  ageUnit: 'weeks',
  location: '',
  farm: '',
  stage: 'Starter',
  status: 'Healthy',
}

export default function FlocksPage() {
  const [flocks, setFlocks] = useState<Flock[]>(initialFlocks)
  const [flockForm, setFlockForm] = useState<FlockFormState>(emptyFlockForm)
  const [editingFlockId, setEditingFlockId] = useState<number | null>(null)
  const [message, setMessage] = useState<ToastState | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | Flock['status']>('All')
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [caseModalFlockId, setCaseModalFlockId] = useState<number | null>(null)
  const [selectedCaseName, setSelectedCaseName] = useState('')
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null)

  useEffect(() => {
    if (!message) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null)
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [message])

  const filteredFlocks = useMemo(() => {
    return flocks.filter((flock) => {
      const archiveMatch =
        archiveFilter === 'all'
          ? true
          : archiveFilter === 'archived'
            ? flock.archived
            : !flock.archived

      const statusMatch = statusFilter === 'All' ? true : flock.status === statusFilter
      const searchMatch =
        search.trim() === ''
          ? true
          : `${flock.name} ${flock.farm} ${flock.location} ${flock.stage}`.toLowerCase().includes(search.toLowerCase())

      return archiveMatch && statusMatch && searchMatch
    })
  }, [archiveFilter, flocks, search, statusFilter])

  const activeCount = flocks.filter((flock) => !flock.archived).length
  const minimumVisibleRows = 25
  const emptyRows = Math.max(minimumVisibleRows - filteredFlocks.length, 0)

  const openCreateModal = () => {
    setEditingFlockId(null)
    setFlockForm(emptyFlockForm)
    setIsFormModalOpen(true)
  }

  const openEditModal = (flock: Flock) => {
    const [ageValue = '', ageUnit = 'weeks'] = flock.age.split(' ')

    setEditingFlockId(flock.id)
    setFlockForm({
      name: flock.name,
      size: String(flock.size),
      ageValue,
      ageUnit: flockAgeUnits.includes(ageUnit as FlockFormState['ageUnit']) ? (ageUnit as FlockFormState['ageUnit']) : 'weeks',
      location: flock.location,
      farm: flock.farm,
      stage: flockStageOptions.includes(flock.stage as FlockFormState['stage']) ? (flock.stage as FlockFormState['stage']) : 'Starter',
      status: flock.status,
    })
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    setEditingFlockId(null)
    setFlockForm(emptyFlockForm)
  }

  const handleFlockInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFlockForm((current) => ({ ...current, [name]: value }))
  }

  const handleSaveFlock = (e: React.FormEvent) => {
    e.preventDefault()

    if (!flockForm.name || !flockForm.size || !flockForm.ageValue || !flockForm.location || !flockForm.farm || !flockForm.stage) {
      setMessage({ text: 'Please complete all flock fields before saving.', tone: 'error' })
      return
    }

    const payload: Flock = {
      id: editingFlockId ?? Date.now(),
      name: flockForm.name,
      size: Number(flockForm.size),
      age: `${flockForm.ageValue} ${flockForm.ageUnit}`,
      location: flockForm.location,
      farm: flockForm.farm,
      stage: flockForm.stage,
      status: flockForm.status,
      archived: editingFlockId ? flocks.find((flock) => flock.id === editingFlockId)?.archived ?? false : false,
      linkedCases: editingFlockId ? flocks.find((flock) => flock.id === editingFlockId)?.linkedCases ?? [] : [],
      lastCheck: 'Just now',
    }

    if (editingFlockId) {
      setFlocks((current) => current.map((flock) => (flock.id === editingFlockId ? payload : flock)))
      setMessage({ text: `${payload.name} updated successfully.`, tone: 'success' })
    } else {
      setFlocks((current) => [payload, ...current])
      setMessage({ text: `${payload.name} created successfully.`, tone: 'success' })
    }

    closeFormModal()
  }

  const handleArchiveToggle = (id: number) => {
    setFlocks((current) =>
      current.map((flock) =>
        flock.id === id ? { ...flock, archived: !flock.archived, lastCheck: 'Just now' } : flock,
      ),
    )
    setMessage({ text: 'Flock archive status updated.', tone: 'success' })
  }

  const handleDeleteFlock = (id: number) => {
    const flockName = flocks.find((flock) => flock.id === id)?.name ?? 'Flock'
    setFlocks((current) => current.filter((flock) => flock.id !== id))
    setMessage({ text: `${flockName} deleted.`, tone: 'success' })
  }

  const closeActionModal = () => {
    setActionModal(null)
  }

  const handleConfirmAction = () => {
    if (!actionModal) {
      return
    }

    if (actionModal.type === 'delete') {
      handleDeleteFlock(actionModal.flock.id)
    } else {
      handleArchiveToggle(actionModal.flock.id)
    }

    closeActionModal()
  }

  const openCaseModal = (flockId: number) => {
    setCaseModalFlockId(flockId)
    setSelectedCaseName('')
  }

  const closeCaseModal = () => {
    setCaseModalFlockId(null)
    setSelectedCaseName('')
  }

  const handleLinkCase = () => {
    if (!caseModalFlockId || !selectedCaseName) {
      setMessage({ text: 'Choose a case to link.', tone: 'error' })
      return
    }

    setFlocks((current) =>
      current.map((flock) =>
        flock.id === caseModalFlockId && !flock.linkedCases.includes(selectedCaseName)
          ? { ...flock, linkedCases: [...flock.linkedCases, selectedCaseName], lastCheck: 'Just now' }
          : flock,
      ),
    )

    setMessage({ text: `Linked "${selectedCaseName}" to the flock.`, tone: 'success' })
    closeCaseModal()
  }

  const activeCaseModalFlock = flocks.find((flock) => flock.id === caseModalFlockId) ?? null

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
          <h1 className="registry-title">Batches</h1>
          <span className="registry-count">{activeCount.toLocaleString()} active batches</span>
        </div>
        <button type="button" className="settings-btn" onClick={openCreateModal}>
          <ActionIcon name="plus" />
          Add batch
        </button>
      </div>

      <section className="registry-panel">
        <div className="registry-toolbar">
          <div className="registry-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input registry-search"
              placeholder="Search batches"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | Flock['status'])}>
              <option value="All">All status</option>
              <option value="Healthy">Healthy</option>
              <option value="Watchlist">Watchlist</option>
              <option value="Priority">Priority</option>
            </select>
            <select value={archiveFilter} onChange={(e) => setArchiveFilter(e.target.value as 'active' | 'archived' | 'all')}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All records</option>
            </select>
          </div>
        </div>

        <div className="registry-table-wrap">
          <table className="flock-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Farm</th>
                <th>Stage</th>
                <th>Phone Area</th>
                <th>Birds</th>
                <th>Cases</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Age</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlocks.length > 0 ? (
                <>
                  {filteredFlocks.map((flock) => (
                    <tr key={flock.id} className={flock.archived ? 'archived-row' : ''}>
                      <td>
                        <div className="table-title-cell">
                          <strong>{flock.name}</strong>
                        </div>
                      </td>
                      <td>{flock.farm}</td>
                      <td>{flock.stage}</td>
                      <td>{flock.location}</td>
                      <td>{flock.size}</td>
                      <td>{flock.linkedCases.length}</td>
                      <td>
                        <span className={`chip registry-chip ${flock.archived ? 'neutral' : `flock-${flock.status.toLowerCase()}`}`}>
                          {flock.archived ? 'Archived' : flock.status}
                        </span>
                      </td>
                      <td>{flock.lastCheck}</td>
                      <td>{flock.age}</td>
                      <td>
                        <div className="table-actions compact-actions">
                          {!flock.archived && (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => openEditModal(flock)}
                              aria-label={`Edit ${flock.name}`}
                              title="Edit flock"
                            >
                              <ActionIcon name="edit" />
                            </button>
                          )}
                          {!flock.archived && (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => openCaseModal(flock.id)}
                              aria-label={`Link case to ${flock.name}`}
                              title="Link case"
                            >
                              <ActionIcon name="link" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() =>
                              setActionModal({
                                type: flock.archived ? 'restore' : 'archive',
                                flock,
                              })
                            }
                            aria-label={`${flock.archived ? 'Restore' : 'Archive'} ${flock.name}`}
                            title={flock.archived ? 'Restore flock' : 'Archive flock'}
                          >
                            <ActionIcon name={flock.archived ? 'restore' : 'archive'} />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn danger-icon-btn"
                            onClick={() =>
                              setActionModal({
                                type: 'delete',
                                flock,
                              })
                            }
                            aria-label={`Delete ${flock.name}`}
                            title="Delete flock"
                          >
                            <ActionIcon name="delete" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: emptyRows }).map((_, index) => (
                    <tr key={`empty-row-${index}`} className="empty-grid-row" aria-hidden="true">
                      <td colSpan={10} />
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-table-state">
                      <div className="empty-watermark" aria-hidden="true">
                        BATCHES
                      </div>
                      <div className="empty-table-copy">No batches match the current filters.</div>
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
              8
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
                <h2>{editingFlockId ? 'Edit Batch' : 'Create New Batch'}</h2>
                <p>Fill in the batch details and save your changes.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeFormModal}>X</button>
            </div>

            <form className="modal-form-shell" onSubmit={handleSaveFlock}>
              <div className="modal-body modal-body-scroll">
                <div className="flock-form modal-form">
                  <label><span>Batch name</span><input name="name" value={flockForm.name} onChange={handleFlockInputChange} placeholder="Batch A - 500 birds" /></label>
                  <label><span>Size</span><input name="size" type="number" min="1" value={flockForm.size} onChange={handleFlockInputChange} placeholder="500" /></label>
                  <label className="split-field">
                    <span>Age</span>
                    <div className="split-field-controls">
                      <input name="ageValue" type="number" min="1" value={flockForm.ageValue} onChange={handleFlockInputChange} placeholder="2" />
                      <select name="ageUnit" value={flockForm.ageUnit} onChange={handleFlockInputChange}>
                        {flockAgeUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label><span>Location</span><input name="location" value={flockForm.location} onChange={handleFlockInputChange} placeholder="House 1" /></label>
                  <label><span>Farm</span><input name="farm" value={flockForm.farm} onChange={handleFlockInputChange} placeholder="Newcastle North Farm" /></label>
                  <label>
                    <span>Stage</span>
                    <select name="stage" value={flockForm.stage} onChange={handleFlockInputChange}>
                      {flockStageOptions.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select name="status" value={flockForm.status} onChange={handleFlockInputChange}>
                      <option value="Healthy">Healthy</option>
                      <option value="Watchlist">Watchlist</option>
                      <option value="Priority">Priority</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-btn modal-btn" onClick={closeFormModal}>Cancel</button>
                <button type="submit" className="primary-btn modal-btn">{editingFlockId ? 'Update batch' : 'Create batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeCaseModalFlock && (
        <div className="modal-backdrop" onClick={closeCaseModal}>
          <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Link Case</h2>
                <p>{activeCaseModalFlock.name}</p>
              </div>
              <button type="button" className="modal-close" onClick={closeCaseModal}>X</button>
            </div>

            <div className="modal-body modal-body-scroll">
              <label className="modal-field">
                <span>Select case</span>
                <select value={selectedCaseName} onChange={(e) => setSelectedCaseName(e.target.value)}>
                  <option value="">Choose a case</option>
                  {availableCases.map((caseName) => (
                    <option key={caseName} value={caseName}>{caseName}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={closeCaseModal}>Cancel</button>
              <button type="button" className="primary-btn modal-btn" onClick={handleLinkCase}>Link case</button>
            </div>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="modal-backdrop" onClick={closeActionModal}>
          <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{actionModal.type === 'delete' ? 'Delete Flock' : actionModal.type === 'archive' ? 'Archive Flock' : 'Restore Flock'}</h2>
                <p>{actionModal.flock.name}</p>
              </div>
              <button type="button" className="modal-close" onClick={closeActionModal}>X</button>
            </div>

            <div className="modal-body modal-body-scroll">
              <p className="modal-copy">
                {actionModal.type === 'delete'
                  ? 'This action will permanently remove the batch from the register.'
                  : actionModal.type === 'archive'
                    ? 'This batch will be moved out of the active list and kept as an archived record.'
                    : 'This batch will be returned to the active list.'}
              </p>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={closeActionModal}>Cancel</button>
              <button
                type="button"
                className={`primary-btn modal-btn ${actionModal.type === 'delete' ? 'danger-solid-btn' : ''}`}
                onClick={handleConfirmAction}
              >
                {actionModal.type === 'delete' ? 'Delete batch' : actionModal.type === 'archive' ? 'Archive batch' : 'Restore batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ActionIcon({ name }: { name: 'edit' | 'link' | 'archive' | 'restore' | 'delete' | 'plus' }) {
  const paths: Record<typeof name, string> = {
    edit: 'M4 20h4l10-10-4-4L4 16v4zm12-12 4 4M14 6l4 4',
    link: 'M10 14 8 16a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M14 10l2-2a3 3 0 1 1 4 4l-3 3a3 3 0 0 1-4 0M9 15l6-6',
    archive: 'M4 7h16M7 7V5h10v2M6 7l1 12h10l1-12M10 11v5M14 11v5',
    restore: 'M12 5a7 7 0 1 1-6.2 3.8M4 5v5h5',
    delete: 'M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12M10 11v5M14 11v5',
    plus: 'M12 5v14M5 12h14',
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
