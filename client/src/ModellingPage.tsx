import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = '/api'
const diseaseFolders = ['cocci', 'healthy', 'ncd', 'salmo'] as const

interface TrainingStatus {
  running: boolean
  action: string | null
  status: string
  last_started_at: string | null
  last_finished_at: string | null
  last_exit_code: number | null
  last_message: string
  log_tail: string[]
  model_ready: boolean
  dataset_path: string
  model_path: string
  confidence_threshold: number
  dataset_summary: Record<string, number>
  uploaded_dataset_path: string
  available_models: Array<{ name: string; path: string; active: boolean }>
  active_model_name: string | null
  current_epoch: number
  total_epochs: number
  progress_percent: number
  progress_phase: string
  train_accuracy: number | null
  validation_accuracy: number | null
  train_loss: number | null
  validation_loss: number | null
}

interface ModellingToast {
  text: string
  tone: 'success' | 'error'
}

interface UploadSummaryModal {
  disease: string
  count: number
  itemType: 'images' | 'frames'
}

export default function ModellingPage() {
  const [status, setStatus] = useState<TrainingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [toast, setToast] = useState<ModellingToast | null>(null)
  const [modelName, setModelName] = useState('')
  const [selectedModelName, setSelectedModelName] = useState('')
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [uploadProgressByDisease, setUploadProgressByDisease] = useState<Record<string, number>>({})
  const [uploadSummaryModal, setUploadSummaryModal] = useState<UploadSummaryModal | null>(null)
  const folderInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/training/status`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Could not load modelling status.')
      }
      setStatus(data)
      setSelectedModelName((current) => current || data.active_model_name || '')
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : 'Could not load modelling status.', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (!status || (!status.running && status.status !== 'paused' && status.status !== 'canceling')) return

    const intervalId = window.setInterval(() => {
      fetchStatus()
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [status])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const modelSummary = useMemo(() => {
    if (!status) return []

    return [
      { label: 'Model status', value: status.model_ready ? 'Ready' : 'Not configured' },
      { label: 'Training state', value: status.running ? `${status.action ?? 'Training'} running` : status.status },
      { label: 'Confidence threshold', value: String(status.confidence_threshold) },
      { label: 'Active model', value: status.active_model_name ?? 'No active model' },
    ]
  }, [status])

  const progressLabel = useMemo(() => {
    if (!status) return 'Loading progress...'
    if (status.running && status.total_epochs > 0) {
      return `Epoch ${status.current_epoch} of ${status.total_epochs}`
    }
    if (status.progress_phase === 'prepare') return 'Preparing dataset'
    if (status.status === 'completed') return 'Training completed'
    if (status.status === 'failed') return 'Training failed'
    return 'No training run yet'
  }, [status])
  const trainingInProgress = Boolean(status?.running && status?.status !== 'paused')

  const runAction = async (action: 'train' | 'recalibrate' | 'reload') => {
    if ((action === 'train' || action === 'recalibrate') && !modelName.trim()) {
      setToast({ text: 'Please enter the model name before starting training.', tone: 'error' })
      return
    }

    if (action === 'train' || action === 'recalibrate') {
      const missingDiseaseFolders = diseaseFolders.filter((disease) => (status?.dataset_summary?.[disease] ?? 0) === 0)
      if (missingDiseaseFolders.length > 0) {
        setToast({
          text: `Upload the ${missingDiseaseFolders.join(', ')} disease folder${missingDiseaseFolders.length > 1 ? 's' : ''} before training.`,
          tone: 'error',
        })
        return
      }
    }

    setBusyAction(action)
    try {
      const response = await fetch(`${API_BASE}/training/${action === 'reload' ? 'reload' : 'start'}`, {
        method: 'POST',
        headers: action === 'reload' ? undefined : { 'Content-Type': 'application/json' },
        body:
          action === 'reload'
            ? undefined
            : JSON.stringify({
                action,
                dataset_path: status?.uploaded_dataset_path,
                model_name: modelName.trim(),
              }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Action failed.')
      }

      setToast({
        text: data.message || (action === 'reload' ? 'Model reloaded.' : `${action} started.`),
        tone: 'success',
      })
      await fetchStatus()
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : 'Action failed.', tone: 'error' })
    } finally {
      setBusyAction(null)
    }
  }

  const handleTrainingControl = async (action: 'pause' | 'resume' | 'cancel') => {
    setBusyAction(action)
    try {
      const response = await fetch(`${API_BASE}/training/${action}`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || `${action} failed.`)
      }
      setToast({ text: data.message, tone: 'success' })
      await fetchStatus()
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : `${action} failed.`, tone: 'error' })
    } finally {
      setBusyAction(null)
    }
  }

  const handleDiseaseUpload = async (disease: (typeof diseaseFolders)[number], files: FileList | null) => {
    if (!files || !files.length) return
    const fileList = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    if (!fileList.length) {
      setToast({ text: 'No valid image or video files were found in that folder.', tone: 'error' })
      return
    }

    setBusyAction(`upload-${disease}`)
    setUploadProgressByDisease((current) => ({ ...current, [disease]: 0 }))
    try {
      const chunkSize = 20

      for (let index = 0; index < fileList.length; index += chunkSize) {
        const chunk = fileList.slice(index, index + chunkSize)
        const formData = new FormData()
        chunk.forEach((file) => formData.append('files', file))

        const response = await fetch(
          `${API_BASE}/training/upload-dataset/${disease}?clear_existing=${index === 0 ? 'true' : 'false'}`,
          {
            method: 'POST',
            body: formData,
          },
        )
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail || 'Dataset upload failed.')
        }

        const uploadedCount = Math.min(index + chunk.length, fileList.length)
        setUploadProgressByDisease((current) => ({
          ...current,
          [disease]: Math.round((uploadedCount / fileList.length) * 100),
        }))
      }

      const containsVideo = fileList.some((file) => file.type.startsWith('video/'))
      setUploadSummaryModal({ disease, count: fileList.length, itemType: containsVideo ? 'frames' : 'images' })
      await fetchStatus()
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : 'Dataset upload failed.', tone: 'error' })
    } finally {
      setUploadProgressByDisease((current) => ({ ...current, [disease]: 0 }))
      setBusyAction(null)
    }
  }

  const handleClearDiseaseUpload = async (disease: (typeof diseaseFolders)[number]) => {
    setBusyAction(`clear-${disease}`)
    try {
      const response = await fetch(`${API_BASE}/training/upload-dataset/${disease}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Could not clear uploaded dataset.')
      }

      setToast({ text: data.message || `${disease.toUpperCase()} uploads cleared.`, tone: 'success' })
      await fetchStatus()
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : 'Could not clear uploaded dataset.', tone: 'error' })
    } finally {
      setBusyAction(null)
    }
  }

  const handleActiveModelChange = async (modelName: string) => {
    setSelectedModelName(modelName)
    if (!modelName) return

    setBusyAction('set-model')
    try {
      const response = await fetch(`${API_BASE}/training/active-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Could not switch active model.')
      }
      setToast({ text: data.message, tone: 'success' })
      await fetchStatus()
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : 'Could not switch active model.', tone: 'error' })
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return <ModellingSkeleton />
  }

  return (
    <section className="page-layout modelling-page">
      {toast && (
        <div className="toast-stack">
          <div className={`toast-notice ${toast.tone === 'success' ? 'toast-success' : 'toast-error'}`}>
            <span>{toast.text}</span>
            <button type="button" className="toast-close" onClick={() => setToast(null)}>
              X
            </button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Modelling</h1>
          <p className="dashboard-desc">Train the detection model, recalibrate it with updated data, and reload the active weights inside the system.</p>
        </div>
        <div className="modelling-header-actions">
          <div className="modelling-header-model">
            <span>Active trained model</span>
            <strong>{status?.active_model_name ?? 'No active model selected'}</strong>
          </div>
          <button type="button" className="settings-btn" onClick={() => setConfigModalOpen(true)}>
            Configurations
          </button>
        </div>
      </div>

      <section className="dashboard-cards modelling-summary-grid">
        {modelSummary.map((item) => (
          <article key={item.label} className="dashboard-card">
            <div className="dashboard-card-label">{item.label}</div>
            <div className="dashboard-card-value modelling-card-value">{item.value}</div>
          </article>
        ))}
      </section>

      <section className="modelling-grid">
        <article className="chart-card modelling-control-card">
          <div className="chart-title">Training controls</div>
          <div className="modelling-dataset-field">
            <span>New model name</span>
            <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="broiler_v1" />
          </div>
          <div className="modelling-note">
            <strong>Training note</strong>
            <p>This name will be used when the newly trained model is saved into the system.</p>
            <p>Prediction stays disabled until you choose which trained model the system should use.</p>
          </div>
          <div className="modelling-dataset-uploads">
            <div className="predict-report-label">Upload disease folders</div>
            <div className="modelling-upload-grid">
              {diseaseFolders.map((disease) => (
                <div key={disease} className="modelling-upload-card">
                  <strong>{disease.toUpperCase()}</strong>
                  <span>
                    {busyAction === `upload-${disease}` && uploadProgressByDisease[disease]
                      ? `Uploading ${uploadProgressByDisease[disease]}%`
                      : `${status?.dataset_summary?.[disease] ?? 0} training frames ready`}
                  </span>
                  <input
                    ref={(element) => {
                      folderInputRefs.current[disease] = element
                      if (element) {
                        element.setAttribute('webkitdirectory', '')
                        element.setAttribute('directory', '')
                      }
                    }}
                    type="file"
                    className="visually-hidden-input"
                    multiple
                    onChange={(event) => {
                      handleDiseaseUpload(disease, event.target.files)
                      event.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    className="ghost-btn modelling-action-btn"
                    disabled={busyAction !== null}
                    onClick={() => folderInputRefs.current[disease]?.click()}
                  >
                    {busyAction === `upload-${disease}` && uploadProgressByDisease[disease]
                      ? `Uploading ${uploadProgressByDisease[disease]}%`
                      : `Upload ${disease} folder`}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn modelling-action-btn modelling-clear-btn"
                    disabled={busyAction !== null || (status?.dataset_summary?.[disease] ?? 0) === 0}
                    onClick={() => handleClearDiseaseUpload(disease)}
                  >
                    {busyAction === `clear-${disease}` ? 'Clearing uploads...' : 'Clear uploads'}
                  </button>
                </div>
              ))}
            </div>
            <p className="card-subtitle">Upload one folder for each disease class. Images are used directly, and videos are converted into training frames before model training.</p>
          </div>
          <div className="modelling-action-list">
            <button
              type="button"
              className="primary-btn modelling-action-btn"
              disabled={Boolean(status?.running) || busyAction !== null}
              onClick={() => runAction('train')}
            >
              Train model
            </button>
            <p className="card-subtitle">Runs the full model training pipeline using the configured droppings dataset.</p>

            <button
              type="button"
              className="ghost-btn modelling-action-btn"
              disabled={Boolean(status?.running) || busyAction !== null}
              onClick={() => runAction('recalibrate')}
            >
              Recalibrate model
            </button>

            <button
              type="button"
              className="ghost-btn modelling-action-btn"
              disabled={busyAction !== null}
              onClick={() => runAction('reload')}
            >
              Reload active model
            </button>

          </div>
        </article>

          <article className="chart-card modelling-status-card">
            <div className="chart-title">Training log</div>
            <div className="modelling-progress-panel">
              <div className="modelling-progress-top">
                <strong className="modelling-progress-label">
                  {progressLabel}
                  {trainingInProgress && (
                    <span className="modelling-live-indicator">
                      <span className="modelling-live-dot" aria-hidden="true" />
                      Training in progress
                    </span>
                  )}
                </strong>
                <span className={trainingInProgress ? 'modelling-progress-value modelling-progress-value-active' : 'modelling-progress-value'}>
                  {Math.round(status?.progress_percent ?? 0)}%
                </span>
              </div>
              <div className={`modelling-progress-bar ${trainingInProgress ? 'modelling-progress-bar-active' : ''}`}>
                <div
                  className={`modelling-progress-fill ${trainingInProgress ? 'modelling-progress-fill-active' : ''}`}
                  style={{ width: `${status?.progress_percent ?? 0}%` }}
                />
              </div>
            <div className="predict-guidance-list modelling-status-list">
              <span>Status: {status?.status ?? 'Loading'}</span>
              <span>Action: {status?.action ?? 'None'}</span>
              <span>Phase: {status?.progress_phase ?? 'idle'}</span>
              <span>Train accuracy: {status?.train_accuracy != null ? `${status.train_accuracy}%` : '--'}</span>
              <span>Validation accuracy: {status?.validation_accuracy != null ? `${status.validation_accuracy}%` : '--'}</span>
              <span>Train loss: {status?.train_loss != null ? status.train_loss : '--'}</span>
              <span>Validation loss: {status?.validation_loss != null ? status.validation_loss : '--'}</span>
              <span>Last message: {status?.last_message ?? 'No message yet'}</span>
            </div>
            <div className="modelling-log-actions">
              <button
                type="button"
                className="ghost-btn modelling-action-btn modelling-control-btn modelling-control-btn-pause"
                disabled={!status?.running || status?.status === 'paused' || busyAction !== null}
                onClick={() => handleTrainingControl('pause')}
              >
                <TrainingControlIcon name="pause" />
                Pause training
              </button>
              <button
                type="button"
                className="ghost-btn modelling-action-btn modelling-control-btn modelling-control-btn-resume"
                disabled={!status?.running || status?.status !== 'paused' || busyAction !== null}
                onClick={() => handleTrainingControl('resume')}
              >
                <TrainingControlIcon name="resume" />
                Resume training
              </button>
              <button
                type="button"
                className="ghost-btn modelling-action-btn modelling-control-btn modelling-control-btn-cancel"
                disabled={!status?.running || busyAction !== null}
                onClick={() => handleTrainingControl('cancel')}
              >
                <TrainingControlIcon name="cancel" />
                Cancel training
              </button>
            </div>
            <div className="modelling-log-list">
              {(status?.log_tail?.length ? status.log_tail : ['No training output yet.']).map((line, index) => (
                <div
                  key={`${index}-${line}`}
                  className={`modelling-log-line ${
                    /completed successfully|training resumed|training paused|model reloaded|uploaded/i.test(line)
                      ? 'modelling-log-line-success'
                      : /failed|error|could not|canceled/i.test(line)
                        ? 'modelling-log-line-error'
                        : ''
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {configModalOpen && (
        <div className="modal-backdrop" onClick={() => setConfigModalOpen(false)}>
          <div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Configurations</h2>
                <p>Choose the trained model the system should use for prediction.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setConfigModalOpen(false)}>X</button>
            </div>

            <div className="modal-body modal-body-scroll">
              <label className="modal-field">
                <span>Choose active trained model</span>
                <select value={selectedModelName} onChange={(e) => handleActiveModelChange(e.target.value)} disabled={busyAction !== null}>
                  <option value="">Select trained model</option>
                  {(status?.available_models ?? []).map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="card-subtitle">The selected model becomes the one used by prediction across the system.</p>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={() => setConfigModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {uploadSummaryModal && (
        <div className="modal-backdrop" onClick={() => setUploadSummaryModal(null)}>
          <div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Upload Complete</h2>
                <p>{uploadSummaryModal.disease.toUpperCase()} dataset folder</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setUploadSummaryModal(null)}>
                X
              </button>
            </div>

            <div className="modal-body modal-body-scroll">
              <div className="modelling-upload-summary">
                <strong>{uploadSummaryModal.count.toLocaleString()} source file{uploadSummaryModal.count > 1 ? 's' : ''} uploaded</strong>
                <span>
                  The {uploadSummaryModal.disease} class is now updated inside the system dataset with {uploadSummaryModal.itemType}.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="primary-btn modal-btn" onClick={() => setUploadSummaryModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ModellingSkeleton() {
  return (
    <section className="page-layout modelling-page dashboard-skeleton">
      <div className="page-header">
        <div>
          <div className="skeleton-line skeleton-line-md" />
          <div className="skeleton-line skeleton-line-lg" />
        </div>
        <div className="modelling-header-actions">
          <div className="modelling-header-model skeleton-card modelling-header-model-skeleton">
            <div className="skeleton-line skeleton-line-sm" />
            <div className="skeleton-line skeleton-line-md" />
          </div>
          <div className="skeleton-button modelling-skeleton-header-btn" />
        </div>
      </div>

      <section className="dashboard-cards modelling-summary-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="dashboard-card skeleton-card">
            <div className="skeleton-line skeleton-line-sm" />
            <div className="skeleton-line skeleton-line-md" />
          </article>
        ))}
      </section>

      <section className="modelling-grid">
        <article className="chart-card skeleton-card">
          <div className="skeleton-line skeleton-line-sm" />
          <div className="modelling-skeleton-field">
            <div className="skeleton-line skeleton-line-sm" />
            <div className="skeleton-button modelling-skeleton-input" />
          </div>
          <div className="modelling-skeleton-note">
            <div className="skeleton-line skeleton-line-sm" />
            <div className="skeleton-line skeleton-line-md" />
            <div className="skeleton-line skeleton-line-md" />
          </div>
          <div className="modelling-upload-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="modelling-upload-card skeleton-card">
                <div className="skeleton-line skeleton-line-sm" />
                <div className="skeleton-line skeleton-line-md" />
                <div className="skeleton-button modelling-skeleton-upload-btn" />
              </div>
            ))}
          </div>
          <div className="modelling-action-list">
            <div className="skeleton-button modelling-skeleton-action-btn" />
            <div className="skeleton-line skeleton-line-md" />
            <div className="skeleton-button modelling-skeleton-action-btn" />
            <div className="skeleton-button modelling-skeleton-action-btn" />
          </div>
        </article>

        <article className="chart-card skeleton-card">
          <div className="skeleton-line skeleton-line-sm" />
          <div className="modelling-progress-panel">
            <div className="modelling-progress-top">
              <div className="skeleton-line skeleton-line-md" />
              <div className="skeleton-line skeleton-line-sm" />
            </div>
            <div className="skeleton-button modelling-skeleton-progress" />
            <div className="predict-guidance-list modelling-status-list">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton-line skeleton-line-md" />
              ))}
            </div>
            <div className="modelling-log-actions">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton-button modelling-skeleton-log-btn" />
              ))}
            </div>
            <div className="modelling-log-list">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="modelling-log-line modelling-log-line-skeleton" />
              ))}
            </div>
          </div>
        </article>
      </section>
    </section>
  )
}

function TrainingControlIcon({ name }: { name: 'pause' | 'resume' | 'cancel' }) {
  const paths: Record<'pause' | 'resume' | 'cancel', string> = {
    pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
    resume: 'M8 5l10 7-10 7z',
    cancel: 'M6 6l12 12M18 6 6 18',
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
