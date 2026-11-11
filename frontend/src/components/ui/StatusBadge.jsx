const statusMap = {
  ACTIVE:    { cls: 'badge-green',  label: 'Active' },
  APPROVED:  { cls: 'badge-green',  label: 'Approved' },
  COMPLETED: { cls: 'badge-green',  label: 'Completed' },
  SUCCESS:   { cls: 'badge-green',  label: 'Success' },
  PENDING:   { cls: 'badge-yellow', label: 'Pending' },
  SUSPENDED: { cls: 'badge-red',    label: 'Suspended' },
  REJECTED:  { cls: 'badge-red',    label: 'Rejected' },
  FAILED:    { cls: 'badge-red',    label: 'Failed' },
  ADMIN:     { cls: 'badge-blue',   label: 'Admin' },
  ACCOUNT_HOLDER: { cls: 'badge-gray', label: 'Account Holder' },
  DEBIT:     { cls: 'badge-red',   label: 'Debit' },
  CREDIT:    { cls: 'badge-green', label: 'Credit' },
};

export default function StatusBadge({ status }) {
  const { cls, label } = statusMap[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}
