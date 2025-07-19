'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Issue {
  id: string;
  title: string;
  status: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIssues() {
      try {
        const issuesRef = collection(db, 'issues');
        const snapshot = await getDocs(issuesRef);
        const list: Issue[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || '(No title)',
            status: data.status || 'open',
            createdAt: data.createdAt,
          });
        });
        setIssues(list);
      } catch (err) {
        setIssues([]);
      }
      setLoading(false);
    }
    fetchIssues();
  }, []);

  const markResolved = async (id: string) => {
    await updateDoc(doc(db, 'issues', id), { status: 'resolved' });
    setIssues(issues => issues.map(issue => issue.id === id ? { ...issue, status: 'resolved' } : issue));
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Issue Management</h1>
      <p className="mb-4">View, assign, and resolve issues/incidents.</p>
      {loading ? <p>Loading...</p> : (
        issues.length === 0 ? <p>No issues found. (Add some to the 'issues' collection in Firestore.)</p> : (
          <table className="min-w-full bg-white rounded shadow text-black">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Title</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Created At</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(issue => (
                <tr key={issue.id}>
                  <td className="py-2 px-4 border-b">{issue.title}</td>
                  <td className="py-2 px-4 border-b">{issue.status}</td>
                  <td className="py-2 px-4 border-b">{issue.createdAt ? new Date(issue.createdAt.seconds * 1000).toLocaleString() : '--'}</td>
                  <td className="py-2 px-4 border-b">
                    {issue.status !== 'resolved' && (
                      <button className="text-green-600 hover:underline" onClick={() => markResolved(issue.id)}>Mark Resolved</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
} 