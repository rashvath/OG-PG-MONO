import noDataImage from '@/assets/no-data.jpg'

export function EmptyTableState() {
  return <img src={noDataImage} alt="No data" className="empty-table-image" loading="lazy" />
}
