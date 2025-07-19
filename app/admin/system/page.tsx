export default function AdminSystemPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">System Health</h1>
      <div className="mb-4">Monitor system health, uptime, and error logs.</div>
      <div className="bg-white rounded shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">Uptime</h2>
        <p className="text-gray-500">99.99% (placeholder)</p>
      </div>
      <div className="bg-white rounded shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">Error Logs</h2>
        <p className="text-gray-500">No recent errors. (placeholder)</p>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Metrics</h2>
        <p className="text-gray-500">More metrics coming soon...</p>
      </div>
    </div>
  );
} 