import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityEvidenceSheet } from './ActivityEvidenceSheet'

describe('ActivityEvidenceSheet', () => {
  it('shows the calorie formula and both citations with working links', () => {
    render(<ActivityEvidenceSheet/>)

    expect(screen.getByText('계산 근거 보기')).toBeInTheDocument()
    expect(screen.getByText(/kcal = MET × 체중\(kg\) × \(분\/60\)/)).toBeInTheDocument()

    const compendium = screen.getByRole('link', { name: /Compendium of Physical Activities/ })
    expect(compendium).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/21681120/')

    const who = screen.getByRole('link', { name: /WHO 2020 Guidelines on Physical Activity/ })
    expect(who).toHaveAttribute('href', 'https://www.who.int/publications/i/item/9789240015128')
  })
})
