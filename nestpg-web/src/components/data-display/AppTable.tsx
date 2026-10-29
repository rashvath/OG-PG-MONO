import type { ReactNode } from 'react'

interface AppTableProps {
  headers: string[]
  children: ReactNode
}

export function AppTable({ headers, children }: AppTableProps) {
  return (
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
