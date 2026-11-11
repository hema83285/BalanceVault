export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span>Showing {start}–{end} of {total}</span>
      <div className="pagination-controls">
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
        <span style={{ padding: '0 8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {page} / {pages}
        </span>
        <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next →</button>
      </div>
    </div>
  );
}
