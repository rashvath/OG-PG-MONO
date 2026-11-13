import { NavLink } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Landmark,
  MessageSquare,
  Settings,
  Users,
  UserSquare2,
} from 'lucide-react'

type SideMenuLink = {
  label: string
  to: string
}

interface SideMenuProps {
  title: string
  links: SideMenuLink[]
}

const iconByLabel: Record<string, typeof Home> = {
  Overview: Home,
  PGs: Building2,
  Complaints: MessageSquare,
  'Rent Payments': Landmark,
  Absences: Clock3,
  'Profile Requests': FileText,
  Owners: UserSquare2,
  Users: Users,
  Enquiries: MessageSquare,
  Approvals: CheckCircle2,
  'Balance Sheet': Landmark,
  'Rooms & Beds': Building2,
  'Form Config': Settings,
  Documents: FileText,
  'Tenant Review': CheckCircle2,
  'Tenant Approvals': CheckCircle2,
  'Tenant Complaints': MessageSquare,
  'Tenant Payments': Landmark,
  'Tenant Absences': Clock3,
  'Tenant Profile Updates': FileText,
  Settings: Settings,
  'Add a PG': Building2,
  'Pending approvals': Clock3,
}

export function SideMenu({ title, links }: SideMenuProps) {
  return (
    <aside className="side-menu">
      <p className="side-menu-title">{title}</p>
      <nav className="side-menu-links" aria-label={`${title} navigation`}>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end>
            {(() => {
              const Icon = iconByLabel[link.label] ?? Home
              return (
                <>
                  <Icon size={17} />
                  <span>{link.label}</span>
                </>
              )
            })()}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
