import { useEffect, useMemo, useState } from 'react'

interface ReportRecord {
  id: number
  reportId: string
  reportName: string
  reportType: 'Case Report' | 'Summary Report'
  flock: string
  disease: string
  samples: number
  generatedOn: string
  status: 'Ready' | 'Pending Review' | 'Shared'
  author: string
  recommendation: string
  summaryLines?: string[]
}

interface ReportToast {
  text: string
  tone: 'success' | 'error'
}

const initialReports: ReportRecord[] = [
  {
    id: 1,
    reportId: 'RPT-001',
    reportName: 'Newcastle Emergency Summary',
    reportType: 'Case Report',
    flock: 'Batch A - 500 birds',
    disease: 'Newcastle Disease',
    samples: 14,
    generatedOn: 'Today, 09:10',
    status: 'Ready',
    author: 'Panashe',
    recommendation: 'Isolate the flock and escalate the report for urgent vet review.',
  },
  {
    id: 2,
    reportId: 'RPT-002',
    reportName: 'Layer Unit C Health Review',
    reportType: 'Case Report',
    flock: 'Layer Unit C',
    disease: 'Coccidiosis',
    samples: 9,
    generatedOn: 'Today, 08:20',
    status: 'Pending Review',
    author: 'Dr. Moyo',
    recommendation: 'Confirm the result with symptoms and begin treatment planning.',
  },
  {
    id: 3,
    reportId: 'RPT-003',
    reportName: 'Block D Healthy Status',
    reportType: 'Case Report',
    flock: 'Block D',
    disease: 'Healthy',
    samples: 18,
    generatedOn: 'Yesterday',
    status: 'Shared',
    author: 'Panashe',
    recommendation: 'Continue routine monitoring and keep the record for reporting.',
  },
]

const flockOptions = ['All flocks', 'Batch A - 500 birds', 'Layer Unit C', 'Block D']

interface SummaryFormState {
  reportName: string
  flock: string
  period: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>(initialReports)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | ReportRecord['status']>('All')
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null)
  const [downloadTarget, setDownloadTarget] = useState<ReportRecord | null>(null)
  const [toast, setToast] = useState<ReportToast | null>(null)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [summaryForm, setSummaryForm] = useState<SummaryFormState>({
    reportName: '',
    flock: 'All flocks',
    period: 'Today',
  })

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const searchMatch =
          search.trim() === ''
            ? true
            : `${report.reportId} ${report.reportName} ${report.flock} ${report.disease} ${report.author}`.toLowerCase().includes(search.toLowerCase())
        const statusMatch = statusFilter === 'All' ? true : report.status === statusFilter
        return searchMatch && statusMatch
      })
      .sort((a, b) => b.id - a.id)
  }, [reports, search, statusFilter])

  const minimumVisibleRows = 18
  const emptyRows = Math.max(minimumVisibleRows - filteredReports.length, 0)

  const handleSummaryInput = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setSummaryForm((current) => ({ ...current, [name]: value }))
  }

  const handleGenerateSummary = () => {
    if (!summaryForm.reportName.trim()) {
      setToast({ text: 'Please enter the report name.', tone: 'error' })
      return
    }

    const scopedReports =
      summaryForm.flock === 'All flocks' ? reports : reports.filter((report) => report.flock === summaryForm.flock)

    const diseaseCounts = scopedReports.reduce<Record<string, number>>((accumulator, report) => {
      accumulator[report.disease] = (accumulator[report.disease] ?? 0) + report.samples
      return accumulator
    }, {})

    const topDiseaseEntry = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0]
    const totalSamples = scopedReports.reduce((sum, report) => sum + report.samples, 0)
    const reportId = `RPT-${String(reports.length + 1).padStart(3, '0')}`
    const summaryLines = [
      `${scopedReports.length} report(s) included in this summary.`,
      `${totalSamples} total screened samples reviewed for ${summaryForm.period.toLowerCase()}.`,
      topDiseaseEntry
        ? `Highest disease signal: ${topDiseaseEntry[0]} with ${topDiseaseEntry[1]} screened samples.`
        : 'No disease activity was found in the selected scope.',
    ]

    const nextReport: ReportRecord = {
      id: Date.now(),
      reportId,
      reportName: summaryForm.reportName.trim(),
      reportType: 'Summary Report',
      flock: summaryForm.flock,
      disease: topDiseaseEntry ? `${topDiseaseEntry[0]} trend summary` : 'No disease activity',
      samples: totalSamples,
      generatedOn: 'Just now',
      status: 'Ready',
      author: 'System',
      recommendation: topDiseaseEntry
        ? `Review the ${topDiseaseEntry[0]} pattern across the selected flock scope and prepare follow-up action where needed.`
        : 'Keep routine monitoring in place and continue recording fresh screening results.',
      summaryLines,
    }

    setReports((current) => [nextReport, ...current])
    setSummaryModalOpen(false)
    setSelectedReport(nextReport)
    setToast({ text: `${reportId} summary report generated.`, tone: 'success' })
  }

  const handleDownload = (report: ReportRecord) => {
    const reportContent = [
      `Report ID: ${report.reportId}`,
      `Report name: ${report.reportName}`,
      `Report type: ${report.reportType}`,
      `Flock: ${report.flock}`,
      `Predicted disease: ${report.disease}`,
      `Samples screened: ${report.samples}`,
      `Generated on: ${report.generatedOn}`,
      `Prepared by: ${report.author}`,
      `Status: ${report.status}`,
      '',
      `Recommendation: ${report.recommendation}`,
      ...(report.summaryLines?.length ? ['', ...report.summaryLines] : []),
    ].join('\n')

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${report.reportId}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    setToast({ text: `${report.reportId} downloaded.`, tone: 'success' })
    setDownloadTarget(null)
  }

  return (
    <section className="page-layout flocks-page">
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
          <h1 className="registry-title">Reports</h1>
          <span className="registry-count">{reports.length.toLocaleString()} recent reports</span>
        </div>
        <button type="button" className="settings-btn" onClick={() => setSummaryModalOpen(true)}>
          <ReportActionIcon name="plus" />
          Generate summary
        </button>
      </div>

      <section className="registry-panel">
        <div className="registry-toolbar">
          <div className="registry-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input registry-search"
              placeholder="Search reports"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | ReportRecord['status'])}>
              <option value="All">All status</option>
              <option value="Ready">Ready</option>
              <option value="Pending Review">Pending review</option>
              <option value="Shared">Shared</option>
            </select>
          </div>
        </div>

        <div className="registry-table-wrap">
          <table className="flock-table reports-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Report name</th>
                <th>Type</th>
                <th>Flock</th>
                <th>Disease</th>
                <th>Samples</th>
                <th>Status</th>
                <th>Prepared by</th>
                <th>Generated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                <>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.reportId}</td>
                      <td>{report.reportName}</td>
                      <td>{report.reportType}</td>
                      <td>{report.flock}</td>
                      <td>{report.disease}</td>
                      <td>{report.samples}</td>
                      <td>
                        <span
                          className={`chip ${
                            report.status === 'Ready'
                              ? 'case-status-resolved'
                              : report.status === 'Pending Review'
                                ? 'case-status-monitoring'
                                : 'case-status-open'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td>{report.author}</td>
                      <td>{report.generatedOn}</td>
                      <td>
                        <div className="table-action-icons">
                          <button type="button" className="icon-action-btn" onClick={() => setSelectedReport(report)} aria-label={`View ${report.reportId}`}>
                            <ReportActionIcon name="view" />
                          </button>
                          <button type="button" className="icon-action-btn" onClick={() => setDownloadTarget(report)} aria-label={`Download ${report.reportId}`}>
                            <ReportActionIcon name="download" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: emptyRows }).map((_, index) => (
                    <tr key={`empty-row-${index}`} className="empty-row">
                      <td colSpan={10}>&nbsp;</td>
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state-watermark-wrap">
                        <div className="empty-state-watermark">REPORTS</div>
                        <div className="empty-state-message">No recent reports match the current filters.</div>
                      </div>
                    </td>
                  </tr>
                  {Array.from({ length: Math.max(minimumVisibleRows - 1, 0) }).map((_, index) => (
                    <tr key={`empty-row-${index}`} className="empty-row">
                      <td colSpan={10}>&nbsp;</td>
                    </tr>
                  ))}
                </>
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
              5
            </button>
          </div>
          <button type="button" className="pager-btn">
            Next
          </button>
        </div>
      </section>

      {selectedReport && (
        <div className="modal-backdrop" onClick={() => setSelectedReport(null)}>
          <div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedReport.reportId}</h2>
                <p>{selectedReport.reportName}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedReport(null)}>
                X
              </button>
            </div>
            <div className="modal-body modal-body-scroll">
              <div className="reports-preview">
                <div className="reports-preview-row">
                  <span>Report name</span>
                  <strong>{selectedReport.reportName}</strong>
                </div>
                <div className="reports-preview-row">
                  <span>Report type</span>
                  <strong>{selectedReport.reportType}</strong>
                </div>
                <div className="reports-preview-row">
                  <span>Disease</span>
                  <strong>{selectedReport.disease}</strong>
                </div>
                <div className="reports-preview-row">
                  <span>Samples screened</span>
                  <strong>{selectedReport.samples}</strong>
                </div>
                <div className="reports-preview-row">
                  <span>Status</span>
                  <strong>{selectedReport.status}</strong>
                </div>
                <div className="reports-preview-row">
                  <span>Prepared by</span>
                  <strong>{selectedReport.author}</strong>
                </div>
                <div className="reports-preview-note">
                  <span>Recommendation</span>
                  <p>{selectedReport.recommendation}</p>
                </div>
                {selectedReport.summaryLines?.length ? (
                  <div className="reports-preview-note">
                    <span>Summary insights</span>
                    <ul className="reports-summary-list">
                      {selectedReport.summaryLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={() => setSelectedReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {downloadTarget && (
        <div className="modal-backdrop" onClick={() => setDownloadTarget(null)}>
          <div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Download report</h2>
                <p>{downloadTarget.reportId}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setDownloadTarget(null)}>
                X
              </button>
            </div>
            <div className="modal-body modal-body-scroll">
              <p className="modal-copy">This will download the selected report for {downloadTarget.flock}.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={() => setDownloadTarget(null)}>
                Cancel
              </button>
              <button type="button" className="primary-btn modal-btn" onClick={() => handleDownload(downloadTarget)}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {summaryModalOpen && (
        <div className="modal-backdrop" onClick={() => setSummaryModalOpen(false)}>
          <div className="modal-card modal-card-small" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Generate Summary Report</h2>
                <p>Create a summary report from the report records currently in the system.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setSummaryModalOpen(false)}>
                X
              </button>
            </div>
            <div className="modal-body modal-body-scroll">
              <label className="modal-field">
                <span>Report name</span>
                <input name="reportName" value={summaryForm.reportName} onChange={handleSummaryInput} placeholder="Report name" />
              </label>
              <label className="modal-field">
                <span>Flock scope</span>
                <select name="flock" value={summaryForm.flock} onChange={handleSummaryInput}>
                  {flockOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-field">
                <span>Reporting period</span>
                <select name="period" value={summaryForm.period} onChange={handleSummaryInput}>
                  <option value="Today">Today</option>
                  <option value="This week">This week</option>
                  <option value="This month">This month</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn modal-btn" onClick={() => setSummaryModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn modal-btn" onClick={handleGenerateSummary}>
                Generate report
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ReportActionIcon({ name }: { name: 'view' | 'download' | 'plus' }) {
  const paths: Record<'view' | 'download' | 'plus', string> = {
    view: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    download: 'M12 4v10M8 10l4 4 4-4M5 18h14',
    plus: 'M12 5v14M5 12h14',
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
