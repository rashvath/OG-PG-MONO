import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

type HelpContent = {
  title: string
  purpose: string
  howTo: string[]
}

const HELP_BY_PATH: Array<{ match: (path: string) => boolean; content: HelpContent }> = [
  {
    match: (path) => path === '/',
    content: {
      title: 'Home',
      purpose: 'Explore trusted PG highlights and quickly jump to areas or listings.',
      howTo: ['Browse featured sections.', 'Use top navigation to open listings.', 'Click a listing to view full details.'],
    },
  },
  {
    match: (path) => path.startsWith('/listings'),
    content: {
      title: 'Listings',
      purpose: 'Find PGs by area, price, and amenities.',
      howTo: ['Use filters on the left.', 'Scan cards for pricing and details.', 'Open a card for complete property information.'],
    },
  },
  {
    match: (path) => path.startsWith('/pg/'),
    content: {
      title: 'PG Details',
      purpose: 'Review full property information before sending an enquiry.',
      howTo: ['Check gallery, amenities, and occupancy.', 'Review pricing and policies.', 'Use enquiry actions to connect with owner/team.'],
    },
  },
  {
    match: (path) => path.startsWith('/owner') && path.endsWith('/add'),
    content: {
      title: 'Owner PG Management',
      purpose: 'Create or update PG listings managed by you.',
      howTo: ['Fill required listing fields.', 'Upload clear room/property photos.', 'Submit and track approval status.'],
    },
  },
  {
    match: (path) => path.startsWith('/owner') && path.endsWith('/residents'),
    content: {
      title: 'Owner People',
      purpose: 'Track resident records and related activity.',
      howTo: ['Add or edit resident records.', 'Update occupancy/notes.', 'Use table actions for quick maintenance.'],
    },
  },
  {
    match: (path) => path.startsWith('/owner') && path.endsWith('/enquiries'),
    content: {
      title: 'Owner Enquiries',
      purpose: 'Respond to incoming interest from potential tenants.',
      howTo: ['Open enquiry details.', 'Mark status after callback or visit.', 'Keep responses timely to improve conversion.'],
    },
  },
  {
    match: (path) => path.startsWith('/owner') && path.endsWith('/balance-sheet'),
    content: {
      title: 'Owner Balance Sheet',
      purpose: 'Track income/expenses and generate exportable financial snapshots.',
      howTo: ['Add entries individually or in bulk.', 'Set date range and generate preview.', 'Save sheet and export CSV when needed.'],
    },
  },
  {
    match: (path) => path === '/owner',
    content: {
      title: 'Owner Overview',
      purpose: 'See your dashboard summary for PG operations.',
      howTo: ['Review key metrics at a glance.', 'Use side menu to open modules.', 'Act on pending items first.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/pgs'),
    content: {
      title: 'Admin PGs',
      purpose: 'View and moderate all listed PGs in the platform.',
      howTo: ['Search and scan listings.', 'Review data quality and status.', 'Take moderation actions where needed.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/owners'),
    content: {
      title: 'Admin Owners',
      purpose: 'Manage owner accounts and their platform access.',
      howTo: ['Review owner profile data.', 'Check verification/approval state.', 'Update account status if required.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/residents'),
    content: {
      title: 'Admin Residents',
      purpose: 'Monitor residents data across owners/PGs.',
      howTo: ['Use filters and tables to locate records.', 'Inspect occupancy details.', 'Coordinate corrections with owners.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/approvals'),
    content: {
      title: 'Admin Approvals',
      purpose: 'Approve or reject owner onboarding requests.',
      howTo: ['Open pending requests.', 'Validate profile and business details.', 'Approve legitimate accounts quickly.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/enquiries'),
    content: {
      title: 'Admin Enquiries',
      purpose: 'Track enquiry operations across the platform.',
      howTo: ['Monitor response health.', 'Check unresolved cases.', 'Support owners where follow-up is delayed.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/users'),
    content: {
      title: 'Admin Users',
      purpose: 'Manage user accounts, roles, and lifecycle actions.',
      howTo: ['Review user list and role assignments.', 'Inspect suspicious records.', 'Apply account actions carefully.'],
    },
  },
  {
    match: (path) => path.startsWith('/admin') && path.endsWith('/balance-sheet'),
    content: {
      title: 'Admin Balance Sheet',
      purpose: 'Get read-only visibility into owner financial summaries.',
      howTo: ['Review saved sheets by owner/PG.', 'Check net balance and generation dates.', 'Audit recent ledger activity.'],
    },
  },
  {
    match: (path) => path === '/admin',
    content: {
      title: 'Admin Overview',
      purpose: 'See platform-level operational health and quick stats.',
      howTo: ['Start from KPI widgets.', 'Prioritize pending approvals and issues.', 'Open modules from side menu for details.'],
    },
  },
]

const DEFAULT_HELP: HelpContent = {
  title: 'Module Help',
  purpose: 'Understand what this page is for and how to use it quickly.',
  howTo: ['Review the content blocks on this page.', 'Use visible actions and forms step by step.', 'Check required fields before saving.'],
}

export function ModuleHelpButton() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const help = useMemo(() => {
    const matched = HELP_BY_PATH.find((entry) => entry.match(location.pathname))
    return matched?.content ?? DEFAULT_HELP
  }, [location.pathname])

  return (
    <div className="module-help-root" aria-live="polite">
      <button
        type="button"
        className="module-help-btn"
        aria-label="Open module help"
        onClick={() => setOpen((current) => !current)}
      >
        i
      </button>

      {open ? (
        <section className="module-help-card" role="dialog" aria-label={`${help.title} help`}>
          <div className="module-help-head">
            <h4>{help.title}</h4>
            <button type="button" className="module-help-close" aria-label="Close module help" onClick={() => setOpen(false)}>
              x
            </button>
          </div>
          <p>
            <strong>Purpose:</strong> {help.purpose}
          </p>
          <p><strong>How to do it:</strong></p>
          <ol>
            {help.howTo.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}
