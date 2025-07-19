'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import React from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { logActivity } from '@/lib/activityLogs';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
}

const ROLES = ['all', 'student', 'teacher', 'ops', 'admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student' });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Helper to refresh users
  const fetchUsers = async () => {
    setLoading(true);
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const userList: User[] = [];
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      userList.push({
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        role: data.role || '',
        status: data.status || 'active',
      });
    });
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      {resetMessage && <div className="mb-4 text-green-600">{resetMessage}</div>}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2 md:mb-0"
          onClick={() => {
            setShowAddModal(true);
            setAddError('');
            setAddSuccess('');
          }}
        >
          + Add User
        </button>
        <input
          type="text"
          placeholder="Search by name or email..."
          className="border rounded px-3 py-2 w-full md:w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border text-black rounded px-3 py-2 w-full md:w-48"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          {ROLES.map(role => (
            <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
          ))}
        </select>
      </div>
      <button
        className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={async () => {
          try {
            await logActivity({
              userId: 'test-admin',
              userName: 'Test Admin',
              action: 'Test log entry',
              details: 'This is a test log to create the activity_logs collection.'
            });
            alert('Test log entry created!');
          } catch (err) {
            console.error('Failed to create test log:', err);
            alert('Failed to create test log. Check console for details.');
          }
        }}
      >
        Create Test Log Entry
      </button>
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black text-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            {addError && <div className="mb-2 text-red-600">{addError}</div>}
            {addSuccess && <div className="mb-2 text-green-600">{addSuccess}</div>}
            <form
              onSubmit={async e => {
                e.preventDefault();
                setAddError('');
                setAddSuccess('');
                try {
                  // 1. Create user in Firebase Auth
                  const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
                  const uid = userCredential.user.uid;
                  // 2. Create user doc in Firestore
                  await setDoc(doc(db, 'users', uid), {
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    status: 'active',
                    createdAt: new Date(),
                  });
                  // 3. Log the activity
                  try {
                    await logActivity({
                      userId: auth.currentUser?.uid || 'admin',
                      userName: auth.currentUser?.email || 'admin',
                      action: `Created user (${newUser.role})`,
                      details: `Name: ${newUser.name}, Email: ${newUser.email}`
                    });
                  } catch (logErr) {
                    console.error('Failed to log activity:', logErr);
                    setAddError('User created, but failed to log activity.');
                  }
                  setAddSuccess('User created successfully!');
                  setShowAddModal(false);
                  setNewUser({ name: '', email: '', password: '', role: 'student' });
                  fetchUsers();
                } catch (err: any) {
                  if (err.code === 'auth/email-already-in-use') {
                    setAddError('Email already in use.');
                  } else {
                    setAddError(err.message || 'Failed to add user.');
                  }
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block mb-1 text-black font-medium">Name</label>
                <input
                  type="text"
                  className="border text-black rounded px-3 py-2 w-full"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-black font-medium">Email</label>
                <input
                  type="email"
                  className="border rounded px-3 py-2 w-full"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Password</label>
                <input
                  type="password"
                  className="border rounded px-3 py-2 w-full"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Role</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  {ROLES.filter(r => r !== 'all').map(role => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black text-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setShowEditModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            {editError && <div className="mb-2 text-red-600">{editError}</div>}
            {editSuccess && <div className="mb-2 text-green-600">{editSuccess}</div>}
            <form
              onSubmit={async e => {
                e.preventDefault();
                setEditError('');
                setEditSuccess('');
                try {
                  const userRef = doc(db, 'users', editUser.id);
                  await updateDoc(userRef, {
                    name: editUser.name,
                    role: editUser.role,
                    status: editUser.status || 'active',
                  });
                  setEditSuccess('User updated successfully!');
                  setShowEditModal(false);
                  setEditUser(null);
                  fetchUsers();
                } catch (err: any) {
                  setEditError(err.message || 'Failed to update user.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block mb-1 font-medium">Name</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  value={editUser.name}
                  onChange={e => setEditUser({ ...editUser, name: e.target.value } as User)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Role</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={editUser.role}
                  onChange={e => setEditUser({ ...editUser, role: e.target.value } as User)}
                >
                  {ROLES.filter(r => r !== 'all').map(role => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Changing the role will affect the user's permissions immediately.</p>
              </div>
              <div>
                <label className="block mb-1 font-medium">Status</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={editUser.status || 'active'}
                  onChange={e => setEditUser({ ...editUser, status: e.target.value } as User)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setDeleteUserId(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl text-black font-bold mb-4">Deactivate User</h2>
            {deleteError && <div className="mb-2 text-red-600">{deleteError}</div>}
            {deleteSuccess && <div className="mb-2 text-green-600">{deleteSuccess}</div>}
            <p className="mb-4 text-black">Are you sure you want to deactivate this user? They will no longer be able to log in, but their data will be retained.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded text-black bg-gray-300 hover:bg-gray-400"
                onClick={() => setDeleteUserId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  setDeleteError('');
                  setDeleteSuccess('');
                  try {
                    const userRef = doc(db, 'users', deleteUserId);
                    await updateDoc(userRef, { status: 'inactive' });
                    setDeleteSuccess('User deactivated successfully!');
                    setDeleteUserId(null);
                    fetchUsers();
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to deactivate user.');
                  }
                }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-black">
            <thead className="text-black">
              <tr>
                <th className="py-2 px-4 border-b text-black">Name</th>
                <th className="py-2 px-4 border-b text-black">Email</th>
                <th className="py-2 px-4 border-b text-black">Role</th>
                <th className="py-2 px-4 border-b text-black">Status</th>
                <th className="py-2 px-4 border-b text-black">Actions</th>
              </tr>
            </thead>
            <tbody className="text-black">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-gray-500 text-black">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="py-2 px-4 border-b text-black">{user.name}</td>
                    <td className="py-2 px-4 border-b text-black">{user.email}</td>
                    <td className="py-2 px-4 border-b text-black">{user.role}</td>
                    <td className="py-2 px-4 border-b text-black">{user.status || 'active'}</td>
                    <td className="py-2 px-4 border-b text-black">
                      <button className="text-blue-600 hover:underline mr-2" onClick={() => { setEditUser(user); setShowEditModal(true); setEditError(''); setEditSuccess(''); }}>Edit</button>
                      <button
                        className="text-yellow-600 hover:underline mr-2"
                        onClick={async () => {
                          setResetMessage('');
                          try {
                            await sendPasswordResetEmail(auth, user.email);
                            setResetMessage(`Password reset email sent to ${user.email}`);
                          } catch (err: any) {
                            setResetMessage(`Failed to send reset email: ${err.message || 'Unknown error'}`);
                          }
                        }}
                      >
                        Reset Password
                      </button>
                      {user.status === 'inactive' ? (
                        <button
                          className="text-green-600 hover:underline"
                          onClick={async () => {
                            try {
                              const userRef = doc(db, 'users', user.id);
                              await updateDoc(userRef, { status: 'active' });
                              fetchUsers();
                            } catch (err: any) {
                              alert('Failed to reactivate user: ' + (err.message || 'Unknown error'));
                            }
                          }}
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button className="text-red-600 hover:underline" onClick={() => setDeleteUserId(user.id)}>Delete</button>
                      )}
                    </td>
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