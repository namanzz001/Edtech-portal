export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow text-center">
        <h1 className="text-3xl font-bold mb-4 text-red-600">Unauthorized</h1>
        <p className="mb-6">You do not have permission to access this page.</p>
        <a href="/" className="text-blue-600 underline">Go to Home</a>
      </div>
    </div>
  );
} 