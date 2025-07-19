"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, Timestamp, query, where, updateDoc } from 'firebase/firestore';
import Link from 'next/link';

interface WeeklyScheduleDay {
  Subject: string;
  Time: string;
  teacher: string;
  zoomLink: string;
}
interface ClassItem {
  day: string;
  date: string;
  subject: string;
  time: string;
  teacher: string;
  grade: string;
  isRescheduleApproved?: boolean;
}
interface FreeSlot {
  day: string;
  time: string;
  date: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudentReschedulePage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submittedClasses, setSubmittedClasses] = useState<string[]>([]); // store class keys for which request is submitted
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudent = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace('/student/login');
          return;
        }
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() || userSnap.data().role !== 'student') {
          router.replace('/unauthorized');
          return;
        }
        const linkedId = userSnap.data().linked_id;
        setStudentId(linkedId);
        const studentRef = doc(db, 'students', linkedId);
        const studentSnap = await getDoc(studentRef);
        if (!studentSnap.exists()) {
          setLoading(false);
          return;
        }
        const studentData = studentSnap.data();
        setStudentName(studentData.name || '');
        // Find teacher from weeklySchedule (assume first found)
        let teacherName = '';
        let teacherIdFound = '';
        const ws = studentData.weeklySchedule || {};
        const classList: ClassItem[] = [];
        for (const day of Object.keys(ws)) {
          const entry = ws[day];
          if (entry && entry.teacher) {
            teacherName = entry.teacher;
            // Find teacherId by name
            const teachersSnap = await getDocs(collection(db, 'teachers'));
            teachersSnap.forEach((doc) => {
              if (doc.data().name === teacherName) {
                teacherIdFound = doc.id;
              }
            });
            // For next 7 days, find classes
            for (let i = 0; i < 7; i++) {
              const dateObj = new Date();
              dateObj.setDate(dateObj.getDate() + i);
              const dayName = DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
              if (ws[dayName] && ws[dayName].teacher === teacherName) {
                classList.push({
                  day: dayName,
                  date: dateObj.toLocaleDateString(),
                  subject: ws[dayName].Subject,
                  time: ws[dayName].Time,
                  teacher: teacherName,
                  grade: studentData.grade || '',
                } as any);
              }
            }
            break;
          }
        }
        setClasses(classList);
        setTeacherId(teacherIdFound);
        setLoading(false);
        // Fetch all reschedule requests for this student
        const reqQ = query(collection(db, 'rescheduleRequests'), where('studentId', '==', linkedId));
        const reqSnap = await getDocs(reqQ);
        const reqs: any[] = [];
        reqSnap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
        setRescheduleRequests(reqs);
      });
    };
    fetchStudent();
  }, []);

  async function handleRequestReschedule(cls: ClassItem) {
    setSelectedClass(cls);
    setSelectedSlot(null);
    setShowModal(true);
    setError('');
    setSuccess('');
    // Fetch teacher's free slots
    if (!teacherId) return;
    const teacherRef = doc(db, 'teachers', teacherId);
    const teacherSnap = await getDoc(teacherRef);
    if (!teacherSnap.exists()) return;
    const freeSlotsObj = teacherSnap.data().freeSlots || {};
    // For next 7 days, show available slots
    const slots: FreeSlot[] = [];
    for (let i = 0; i < 7; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + i);
      const dayName = DAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
      if (freeSlotsObj[dayName]) {
        for (const time of freeSlotsObj[dayName]) {
          slots.push({ day: dayName, time, date: dateObj.toLocaleDateString() });
        }
      }
    }
    setFreeSlots(slots);
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedClass || !selectedSlot) {
      setError('Please select a slot.');
      return;
    }
    // Prevent duplicate pending requests for this class/slot
    const reqQ = query(
      collection(db, 'rescheduleRequests'),
      where('studentId', '==', studentId),
      where('classDay', '==', selectedClass.day),
      where('oldTime', '==', selectedClass.time),
      where('status', '==', 'pending')
    );
    const reqSnap = await getDocs(reqQ);
    if (!reqSnap.empty) {
      setError('You already have a pending request for this class.');
      return;
    }
    try {
      // Set isRescheduleApproved: false on the requested slot in student's weeklySchedule
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        const ws = { ...(studentData.weeklySchedule || {}) };
        ws[selectedSlot.day] = {
          ...(ws[selectedSlot.day] || {}),
          Time: selectedSlot.time,
          isRescheduleApproved: false,
        };
        await updateDoc(studentRef, { weeklySchedule: ws });
      }
      await addDoc(collection(db, 'rescheduleRequests'), {
        studentId,
        studentName,
        grade: (selectedClass as any).grade || '',
        subject: selectedClass.subject || '',
        teacherId,
        teacherName: selectedClass.teacher,
        previousSlot: { day: selectedClass.day, time: selectedClass.time, date: selectedClass.date },
        requestedSlot: { day: selectedSlot.day, time: selectedSlot.time, date: selectedSlot.date },
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      setSuccess('Reschedule request sent!');
      setShowModal(false);
      setSubmittedClasses((prev) => [...prev, `${selectedClass.day}_${selectedClass.time}`]);
      // Refetch reschedule requests so UI updates
      const reqQ = query(collection(db, 'rescheduleRequests'), where('studentId', '==', studentId));
      const reqSnap = await getDocs(reqQ);
      const reqs: any[] = [];
      reqSnap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
      setRescheduleRequests(reqs);
    } catch (err: any) {
      setError('Failed to send request.');
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-6">
        <h2 className="text-xl font-bold mb-8">🎓 Debe Student</h2>
        <ul className="space-y-4">
          <li><Link href="/student/dashboard" className="hover:underline">Dashboard</Link></li>
          <li><Link href="/student/curriculum" className="hover:underline">Curriculum</Link></li>
          <li><Link href="/student/reschedule" className="hover:underline font-bold">Reschedule</Link></li>
          <li><button onClick={async () => { await auth.signOut(); router.replace('/student/login'); }} className="hover:underline text-left w-full">Logout</button></li>
        </ul>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-6">🔄 Request Reschedule</h1>
        {loading ? <p>Loading...</p> : (
          <div className="space-y-6">
            {classes.length === 0 ? <p>No upcoming classes found.</p> : (
              classes.map((cls, idx) => {
                // Find the most recent reschedule request for this class/slot
                const relevantRequests = rescheduleRequests
                  .filter(r =>
                    r.subject === cls.subject &&
                    r.studentId === studentId &&
                    r.previousSlot?.day === cls.day &&
                    r.previousSlot?.time === cls.time
                  )
                  .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                let buttonText = 'Request Reschedule';
                let buttonDisabled = false;
                let buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white';
                if (relevantRequests.length > 0) {
                  const latest = relevantRequests[0];
                  if (latest.status === 'pending') {
                    buttonText = 'Requested';
                    buttonDisabled = true;
                    buttonClass = 'bg-gray-400 cursor-not-allowed text-white';
                  } else if (latest.status === 'approved') {
                    buttonText = 'Approved';
                    buttonDisabled = true;
                    buttonClass = 'bg-green-600 text-white';
                  } else if (latest.status === 'rejected') {
                    buttonText = 'Request Reschedule';
                    buttonDisabled = false;
                    buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white';
                  }
                }
                // In the button logic, check isRescheduleApproved for this slot
                if (cls.isRescheduleApproved === true) {
                  buttonText = 'Approved';
                  buttonDisabled = true;
                  buttonClass = 'bg-green-600 text-white';
                } else if (cls.isRescheduleApproved === false) {
                  buttonText = 'Requested';
                  buttonDisabled = true;
                  buttonClass = 'bg-gray-400 cursor-not-allowed text-white';
                }
                return (
                  <div key={idx} className="border rounded-xl p-4 shadow bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="font-semibold text-lg">{cls.subject}</div>
                      <div className="text-gray-600">{cls.day}, {cls.date} at {cls.time}</div>
                      <div className="text-gray-500 text-sm">Teacher: {cls.teacher}</div>
                    </div>
                    <button
                      onClick={() => handleRequestReschedule(cls)}
                      className={`px-4 py-2 rounded ${buttonClass}`}
                      disabled={buttonDisabled}
                    >
                      {buttonText}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
        {/* Modal for selecting slot */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Select a New Slot</h2>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {freeSlots.length === 0 ? <p>No free slots available.</p> : (
                    freeSlots.map((slot, idx) => (
                      <label key={idx} className="flex items-center gap-2">
                        <input type="radio" name="slot" checked={selectedSlot === slot} onChange={() => setSelectedSlot(slot)} />
                        {slot.day}, {slot.date} at {slot.time}
                      </label>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Send Request</button>
                  <button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {success && <div className="text-green-600 text-sm">{success}</div>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 