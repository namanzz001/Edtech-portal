'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Image from 'next/image';

export default function StudentLogin() {
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

      // Fetch user role from Firestore
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role === 'student') {
          router.push('/student/dashboard');
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
    <div className="min-h-screen flex flex-col bg-[#181818]">
      <div className="flex items-center p-6 absolute top-0 left-0">
        <Image src="/Vector.png" alt="Debe Logo" width={100} height={100} />
        <span className="ml-3 text-3xl font-bold text-[#FFA726] tracking-tight" style={{ fontFamily: 'inherit' }}></span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6F00]">Student Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFA726] text-center placeholder-gray-400 text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFA726] text-center placeholder-gray-400 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#FFA726] text-white py-2 rounded font-semibold hover:bg-[#FF9800] transition"
            >
              Login
            </button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
