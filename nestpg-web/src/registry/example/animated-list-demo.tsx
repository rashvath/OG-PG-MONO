type AnimatedListDemoProps = {
  className?: string
}

const events = [
  'New approval request from Oak Stay',
  'Owner KYC submitted',
  'Price update in HSR Layout',
  'New enquiry for Maple PG',
]

export default function AnimatedListDemo({ className }: AnimatedListDemoProps) {
  return (
    <div className={`mini-list-demo ${className ?? ''}`.trim()}>
      {events.map((event) => (
        <div key={event} className="mini-list-item">
          <span className="mini-list-dot" />
          <p>{event}</p>
        </div>
      ))}
    </div>
  )
}
