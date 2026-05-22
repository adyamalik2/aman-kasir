/**
 * Vitest setup file — dijalankan sebelum setiap test suite
 *
 * Mengextend expect() dari Vitest dengan matchers @testing-library/jest-dom:
 * - toBeInTheDocument()
 * - toHaveTextContent()
 * - toBeVisible()
 * - toBeDisabled()
 * - dll (lihat docs: https://github.com/testing-library/jest-dom)
 */
import '@testing-library/jest-dom'
