import { useState, type ChangeEvent } from 'react'
import './App.css'

type QuoteItem = {
  rowNumber: number
  sourceIndex: number | null
  molportId: string
  productId: string
  supplier: string
  catalogueNumber: string
  deliveryTime: number | null
  searchCriteria: string
  matchType: string
  smiles: string
  molecularWeight: number | null
  unit: string
  unitPrice: number | null
  quantity: number | null
  discountUsd: number | null
  netPriceUsd: number | null
  purity: string
  iupac: string
  compliance: string
  isValid: boolean
  errors: string[]
  discountPercent: number
}

type QuoteImportSummary = {
  totalRows: number
  validRows: number
  invalidRows: number
  rowsWithMissingMolportId: number
  rowsWithMissingSupplier: number
  rowsWithMissingCatalogueNumber: number
  rowsWithMissingUnit: number
  rowsWithInvalidUnitPrice: number
  rowsWithInvalidQuantity: number
  totalNetAmount: number
}

type QuoteImportPreviewResult = {
  summary: QuoteImportSummary
  items: QuoteItem[]
}

type ImportQuoteResult = {
  success: boolean
  message: string
  importedAtUtc: string
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'https://localhost:7172'
const pageSize = 20

const formatMoney = (value: number | null) =>
  value === null ? '—' : `$${value.toFixed(2)}`

const formatNumber = (value: number | null) =>
  value === null ? '—' : value.toString()

async function getErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const body = (await response.json()) as {
      detail?: string
      title?: string
      message?: string
    }

    return body.message ?? body.detail ?? body.title ?? 'Request failed.'
  }

  return (await response.text()) || 'Request failed.'
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<QuoteImportPreviewResult | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showInvalidRows, setShowInvalidRows] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const items = preview?.items ?? []
  const displayedItems = items.filter((item) =>
    showInvalidRows ? !item.isValid : item.isValid,
  )
  const totalPages = Math.max(1, Math.ceil(displayedItems.length / pageSize))
  const firstItemIndex = (currentPage - 1) * pageSize
  const currentItems = displayedItems.slice(
    firstItemIndex,
    firstItemIndex + pageSize,
  )
  const firstVisiblePage = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - 4),
  )
  const visiblePages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => firstVisiblePage + index,
  )

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null)
    setPreview(null)
    setCurrentPage(1)
    setShowInvalidRows(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setPreview(null)
    setCurrentPage(1)
    setShowInvalidRows(false)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${apiBaseUrl}/api/quotes/preview`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const result = (await response.json()) as QuoteImportPreviewResult
      setPreview(result)
      setCurrentPage(1)
    } catch (error) {
      setPreview(null)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to preview the quote.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/quotes/import`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const result = (await response.json()) as ImportQuoteResult
      setSuccessMessage(result.message)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to import the quote.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <main className="container-fluid px-3 px-lg-4 py-5">
      <div className="mx-auto page-content">
        <div className="mb-4">
          <h1 className="mb-2">Import Quote</h1>
          <p className="text-body-secondary">
            Upload an Excel quote file to preview and import its quote items.
          </p>
        </div>

        <section className="card shadow-sm mb-4">
          <div className="card-body">
            <label htmlFor="quoteFile" className="form-label fw-semibold">
              Excel quote file
            </label>
            <input
              id="quoteFile"
              className="form-control mb-3"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedFile || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? 'Loading...' : 'Upload File'}
            </button>

            <button
              type="button"
              className="btn btn-success"
              disabled={isImporting}
              onClick={handleImport}
            >
              {isImporting ? 'Importing...' : 'Import Quote'}
          </button>
          </div>
        </section>

        {selectedFile && (
          <div className="alert alert-info" role="alert">
            Selected file: <strong>{selectedFile.name}</strong>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" role="alert">
            {successMessage}
          </div>
        )}

        {isUploading && (
          <section
            className="card shadow-sm mb-4"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="card-body d-flex flex-column align-items-center justify-content-center gap-3 py-5">
              <div
                className="spinner-border text-primary"
                role="status"
                aria-hidden="true"
              />
              <span className="fw-semibold">Loading quote preview...</span>
              <span className="text-body-secondary">
                The Excel file is being processed.
              </span>
            </div>
          </section>
        )}

        {preview && (
          <>
            <section className="row g-3 mb-4">
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="text-body-secondary">Total rows</div>
                    <div className="fs-3 fw-semibold">
                      {preview.summary.totalRows}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm border-success">
                  <div className="card-body">
                    <div className="text-body-secondary">Valid rows</div>
                    <div className="fs-3 fw-semibold text-success">
                      {preview.summary.validRows}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm border-danger">
                  <div className="card-body">
                    <div className="text-body-secondary">Invalid rows</div>
                    <div className="fs-3 fw-semibold text-danger">
                      {preview.summary.invalidRows}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="text-body-secondary">Total net amount</div>
                    <div className="fs-3 fw-semibold">
                      {formatMoney(preview.summary.totalNetAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card shadow-sm mb-4">
              <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                <span className="fw-semibold">Quote items</span>
                <div className="d-flex flex-wrap align-items-center gap-3">
                  <span className="text-body-secondary">
                    Showing{' '}
                    {displayedItems.length === 0 ? 0 : firstItemIndex + 1}-
                    {Math.min(
                      firstItemIndex + pageSize,
                      displayedItems.length,
                    )}{' '}
                    of {displayedItems.length}
                  </span>
                  <div className="form-check form-switch mb-0">
                    <input
                      id="showInvalidRows"
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      checked={showInvalidRows}
                      disabled={preview.summary.invalidRows === 0}
                      onChange={(event) => {
                        setShowInvalidRows(event.target.checked)
                        setCurrentPage(1)
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="showInvalidRows"
                    >
                      Show invalid rows ({preview.summary.invalidRows})
                    </label>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-striped table-hover align-middle text-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Row</th>
                      <th scope="col">#</th>
                      <th scope="col">Molport ID</th>
                      <th scope="col">Product ID</th>
                      <th scope="col">Supplier</th>
                      <th scope="col">Catalogue Number</th>
                      <th scope="col">Delivery Time</th>
                      <th scope="col">Search Criteria</th>
                      <th scope="col">Match Type</th>
                      <th scope="col">SMILES</th>
                      <th scope="col">Molecular Weight</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Unit Price</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Discount (USD)</th>
                      <th scope="col">Discount %</th>
                      <th scope="col">Net Price (USD)</th>
                      <th scope="col">Purity</th>
                      <th scope="col">IUPAC</th>
                      <th scope="col">Compliance</th>
                      <th scope="col">Status</th>
                      <th scope="col">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr key={`${item.rowNumber}-${item.sourceIndex ?? 'null'}`}>
                        <th scope="row">{item.rowNumber}</th>
                        <td>{formatNumber(item.sourceIndex)}</td>
                        <td>{item.molportId || '—'}</td>
                        <td>{item.productId || '—'}</td>
                        <td>{item.supplier || '—'}</td>
                        <td>{item.catalogueNumber || '—'}</td>
                        <td>{formatNumber(item.deliveryTime)}</td>
                        <td>{item.searchCriteria || '—'}</td>
                        <td>{item.matchType || '—'}</td>
                        <td className="font-monospace">{item.smiles || '—'}</td>
                        <td>{formatNumber(item.molecularWeight)}</td>
                        <td>{item.unit || '—'}</td>
                        <td>{formatMoney(item.unitPrice)}</td>
                        <td>{formatNumber(item.quantity)}</td>
                        <td>{formatMoney(item.discountUsd)}</td>
                        <td>{item.discountPercent.toFixed(2)}%</td>
                        <td>{formatMoney(item.netPriceUsd)}</td>
                        <td>{item.purity || '—'}</td>
                        <td>{item.iupac || '—'}</td>
                        <td>{item.compliance || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              item.isValid
                                ? 'text-bg-success'
                                : 'text-bg-danger'
                            }`}
                          >
                            {item.isValid ? 'Valid' : 'Invalid'}
                          </span>
                        </td>
                        <td>{item.errors.join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-3">
                <span className="text-body-secondary">
                  Page {currentPage} of {totalPages}
                </span>
                <nav aria-label="Quote items pagination">
                  <ul className="pagination mb-0">
                    <li
                      className={`page-item ${
                        currentPage === 1 ? 'disabled' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                      >
                        Previous
                      </button>
                    </li>

                    {visiblePages.map((page) => (
                      <li
                        key={page}
                        className={`page-item ${
                          currentPage === page ? 'active' : ''
                        }`}
                        aria-current={
                          currentPage === page ? 'page' : undefined
                        }
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </li>
                    ))}

                    <li
                      className={`page-item ${
                        currentPage === totalPages ? 'disabled' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </section>

          </>
        )}
      </div>
    </main>
  )
}

export default App
