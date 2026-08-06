import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Fails on serious/critical WCAG 2.x A/AA violations -- the "no major
 * automated accessibility violations" bar from Phase 11's acceptance
 * criteria, not zero violations of any severity (axe's own "best
 * practice" and "minor" findings are frequently debatable/non-normative
 * and are logged rather than failing the smoke suite on their own).
 */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );

  if (results.violations.length > serious.length) {
    console.log(
      `[a11y] ${results.violations.length - serious.length} minor/moderate finding(s) on ${page.url()} (not failing):`,
      results.violations
        .filter((v) => v.impact !== 'serious' && v.impact !== 'critical')
        .map((v) => v.id),
    );
  }

  expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
}
