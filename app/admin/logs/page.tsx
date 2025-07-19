'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActivityLog {
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp?: { seconds: number; nanoseconds: number };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const logsList: ActivityLog[] = [];
      querySnapshot.forEach(doc => {
        logsList.push(doc.data() as ActivityLog);
      });
      setLogs(logsList);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Activity Logs</h1>
      <p className="mb-4">View all important actions performed by admins, ops, teachers, and students.</p>
      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-black">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Date/Time</th>
                <th className="py-2 px-4 border-b">User</th>
                <th className="py-2 px-4 border-b">Action</th>
                <th className="py-2 px-4 border-b">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 text-gray-500">No activity logs found.</td></tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-4 border-b">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '--'}</td>
                    <td className="py-2 px-4 border-b">{log.userName || log.userId}</td>
                    <td className="py-2 px-4 border-b">{log.action}</td>
                    <td className="py-2 px-4 border-b">{log.details || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 