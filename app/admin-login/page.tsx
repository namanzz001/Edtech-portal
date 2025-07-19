'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Image from 'next/image';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          setError(`Access denied. You are registered as a ${userData.role}.`);
        }
      } else {
        setError('User data not found in Firestore.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-opacity-95 px-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Image src="/Vector.png" alt="Debe Logo" width={100} height={100} />
        <span className="text-3xl font-bold text-yellow-400 font-cursive"></span>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-6 text-center text-orange-500">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4 w-full" onKeyDown={e => { if (e.key === 'Enter') handleLogin(e); }}>
          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded px-3 py-2 text-black placeholder-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded px-3 py-2 text-black placeholder-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-orange-400 text-white py-2 rounded hover:bg-orange-500 text-lg font-semibold"
          >
            Login
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
} 