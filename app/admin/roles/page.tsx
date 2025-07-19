'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const ref = collection(db, 'users');
        const snapshot = await getDocs(ref);
        const list: User[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            name: data.name || '',
            email: data.email || '',
            role: data.role || '',
          });
        });
        setUsers(list);
      } catch (err) {
        setUsers([]);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  // Placeholder for editing roles
  const handleEditRole = (id: string) => {
    alert('Role editing coming soon!');
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Role Management</h1>
      <p className="mb-4">Manage user roles and permissions.</p>
      {loading ? <p>Loading...</p> : (
        users.length === 0 ? <p>No users found.</p> : (
          <table className="min-w-full bg-white rounded shadow text-black">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Name</th>
                <th className="py-2 px-4 border-b">Email</th>
                <th className="py-2 px-4 border-b">Role</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="py-2 px-4 border-b">{user.name}</td>
                  <td className="py-2 px-4 border-b">{user.email}</td>
                  <td className="py-2 px-4 border-b">{user.role}</td>
                  <td className="py-2 px-4 border-b">
                    <button className="text-blue-600 hover:underline" onClick={() => handleEditRole(user.id)}>Edit Role</button>
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