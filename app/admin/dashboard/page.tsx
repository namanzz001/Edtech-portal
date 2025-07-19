'use client';
import { useEffect, useState } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminDashboard() {
  const [userCount, setUserCount] = useState<number | null>(null);
  // Placeholders for future implementation
  const [classesToday, setClassesToday] = useState<number | null>(null);
  const [unresolvedIssues, setUnresolvedIssues] = useState<number | null>(null);

  useEffect(() => {
    // Fetch total users
    async function fetchUserCount() {
      const usersRef = collection(db, 'users');
      const snapshot = await getCountFromServer(usersRef);
      setUserCount(snapshot.data().count);
    }
    fetchUserCount();
    // TODO: Fetch classes scheduled for today from students' weeklySchedule
    // TODO: Fetch unresolved issues from issues collection
  }, []);

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Welcome, Admin!</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">👥 Users</h2>
          <p className="text-2xl font-bold">{userCount !== null ? userCount : '--'}</p>
          <p className="text-gray-500">Total users (students, teachers, ops)</p>
        </div>
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">📚 Classes Today</h2>
          <p className="text-2xl font-bold">{classesToday !== null ? classesToday : '--'}</p>
          <p className="text-gray-500">Scheduled classes for today</p>
          {/* TODO: Implement logic to count classes scheduled for today */}
        </div>
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-2">🚩 Unresolved Issues</h2>
          <p className="text-2xl font-bold">{unresolvedIssues !== null ? unresolvedIssues : '--'}</p>
          <p className="text-gray-500">Open issues or incidents</p>
          {/* TODO: Implement logic to count unresolved issues */}
        </div>
      </div>
      <div className="bg-white rounded shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <ul className="space-y-2 text-gray-700">
          <li>--</li>
        </ul>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Unresolved Issues</h2>
        <ul className="space-y-2 text-gray-700">
          <li>--</li>
        </ul>
      </div>
    </>
  );
} 