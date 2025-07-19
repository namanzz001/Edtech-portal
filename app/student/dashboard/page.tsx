'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ClassItem {
  day: string;
  subject: string;
  time: string;
  zoomLink: string;
  teacher: string;
  date: number; // timestamp for sorting and display
  topic?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<ClassItem[]>([]);
  const [todayClass, setTodayClass] = useState<ClassItem | null>(null);
  const [rescheduleStatus, setRescheduleStatus] = useState<string | null>(null);

  // Helper to get the next date for a given day name
  function getNextDateForDay(dayName: string) {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const targetIdx = DAYS.indexOf(dayName);
    let diff = targetIdx - todayIdx;
    if (diff < 0) diff += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate.getTime(); // return timestamp
  }

  useEffect(() => {
    const fetchStudent = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace('/login');
          return;
        }

        const uid = user.uid;
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || userSnap.data().role !== 'student') {
          router.replace('/unauthorized');
          return;
        }

        const linkedId = userSnap.data().linked_id;
        const studentRef = doc(db, 'students', linkedId);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          const data = studentSnap.data();
          setStudentName(data.name);
          setGrade(data.grade);

          const schedule = Object.entries(data.weeklySchedule || {}).map(
            ([day, value]: any) => ({
              day,
              subject: value.Subject,
              time: value.Time,
              zoomLink: value.zoomLink,
              teacher: value.teacher || 'TBD',
              date: getNextDateForDay(day),
              topic: value.topic || '',
            })
          );
          // Sort by date
          schedule.sort((a, b) => a.date - b.date);
          setWeeklySchedule(schedule);

          // Match today’s class
          const today = new Date().toLocaleString('en-US', {
            weekday: 'short',
          }); // e.g., 'Mon'
          const todayClass = schedule.find((cls) => cls.day === today);
          if (todayClass) setTodayClass(todayClass);

          // Fetch latest reschedule request
          const reqQ = query(
            collection(db, 'rescheduleRequests'),
            where('studentId', '==', linkedId),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const reqSnap = await getDocs(reqQ);
          if (!reqSnap.empty) {
            const req = reqSnap.docs[0].data();
            if (req.status === 'approved' || req.status === 'rejected') {
              setRescheduleStatus(req.status);
            }
          }
        }
      });
    };

    fetchStudent();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/student/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-6">
        <h2 className="text-xl font-bold mb-8">🎓 Debe Student</h2>
        <ul className="space-y-4">
          <li><Link href="/student/dashboard" className="hover:underline">Dashboard</Link></li>
          <li><Link href="/student/curriculum" className="hover:underline">Curriculum</Link></li>
          <li><Link href="/student/reschedule" className="hover:underline">Reschedule</Link></li>
          <li><button onClick={handleLogout} className="hover:underline text-left w-full">Logout</button></li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100 text-black">
        {rescheduleStatus === 'approved' && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-800 rounded">
            Your reschedule request was <b>approved</b>! Please check your updated schedule.
          </div>
        )}
        {rescheduleStatus === 'rejected' && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-800 rounded">
            Your reschedule request was <b>rejected</b>. Please contact your teacher or try another slot.
          </div>
        )}
        <h1 className="text-2xl font-bold mb-4">👋 Hello, {studentName || '...'} | Grade {grade}</h1>

        {/* Weekly Schedule */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">📅 Weekly Schedule</h2>
          <div className="bg-white rounded shadow p-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Day</th>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Topic</th>
                  <th>Time</th>
                  <th>Zoom</th>
                </tr>
              </thead>
              <tbody>
                {weeklySchedule.map((cls, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{cls.day}</td>
                    <td>{cls.date ? new Date(cls.date).toLocaleDateString() : ''}</td>
                    <td>{cls.subject}</td>
                    <td>{cls.topic || ''}</td>
                    <td>{cls.time}</td>
                    <td>
                      <a href={cls.zoomLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Join</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today’s Class */}
        {todayClass && (
          <div>
            <h2 className="text-xl font-semibold mb-2">📍 Today’s Class</h2>
            <div className="bg-white rounded shadow p-4">
              <p><strong>Subject:</strong> {todayClass.subject}</p>
              <p><strong>Time:</strong> {todayClass.time}</p>
              <p><strong>Teacher:</strong> {todayClass.teacher}</p>
              <div className="mt-2 space-x-4">
                <a href={todayClass.zoomLink} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Join Zoom</a>
                <Link href="/student/curriculum" className="text-blue-600 underline">Class Details</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
