"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import TeacherSidebar from '@/components/TeacherSidebar';
import { timeSlots } from '../../../lib/timeSlots';

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherFreeSlotsPage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [freeSlots, setFreeSlots] = useState<{ [day: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeacher = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace('/teacher/login');
          return;
        }
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() || userSnap.data().role !== 'teacher') {
          router.replace('/unauthorized');
          return;
        }
        const tId = userSnap.data().linked_id || user.uid;
        setTeacherId(tId);
        const teacherRef = doc(db, 'teachers', tId);
        const teacherSnap = await getDoc(teacherRef);
        if (!teacherSnap.exists()) {
          setLoading(false);
          return;
        }
        const teacherData = teacherSnap.data();
        setTeacherName(teacherData.name || '');
        setFreeSlots(teacherData.freeSlots || {});
        setLoading(false);
      });
    };
    fetchTeacher();
  }, []);

  function handleSlotChange(day: string, idx: number, value: string) {
    setFreeSlots((prev) => ({
      ...prev,
      [day]: prev[day]?.map((slot, i) => (i === idx ? value : slot)) || [],
    }));
  }

  function handleAddSlot(day: string) {
    setFreeSlots((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), ''],
    }));
  }

  function handleRemoveSlot(day: string, idx: number) {
    setFreeSlots((prev) => ({
      ...prev,
      [day]: prev[day]?.filter((_, i) => i !== idx) || [],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const teacherRef = doc(db, 'teachers', teacherId);
      await updateDoc(teacherRef, { freeSlots });
      setSuccess('Free slots updated!');
    } catch (err) {
      setError('Failed to update slots.');
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <TeacherSidebar />
      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-6">🕒 My Free Slots</h1>
        {loading ? <p>Loading...</p> : (
          <form onSubmit={handleSave} className="space-y-6">
            {DAYS.map(day => (
              <div key={day} className="mb-4">
                <div className="font-semibold mb-2">{day}</div>
                <div className="flex flex-col gap-2">
                  {(freeSlots[day] || []).map((slot, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={slot}
                        onChange={e => handleSlotChange(day, idx, e.target.value)}
                        className="p-2 border rounded w-40"
                      >
                        <option value="">Select a time</option>
                        {timeSlots.map((time: string) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleRemoveSlot(day, idx)} className="text-red-600">Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => handleAddSlot(day)} className="text-blue-600">+ Add Slot</button>
                </div>
              </div>
            ))}
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save Slots</button>
            {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
} 