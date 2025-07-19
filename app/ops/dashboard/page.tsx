'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import Sidebar from '../../../components/OpsSidebar';
import { useRouter } from 'next/navigation';

interface ScheduledClass {
  studentName: string;
  grade: string;
  subject: string;
  time: string;
  teacher: string;
  zoomLink: string;
}

interface RescheduleRequest {
  id: string;
  studentName: string;
  grade: string;
  subject?: string;
  teacherName: string;
  previousSlot: { day: string; time: string; date?: string };
  requestedSlot: { day: string; time: string; date?: string };
  status: string;
}

function getTodayKey() {
  // Returns 'Mon', 'Tue', etc.
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}

export default function OpsDashboard() {
  const router = useRouter();
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace('/login');
          return;
        }
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() || userSnap.data().role !== 'ops') {
          router.replace('/unauthorized');
          return;
        }
      });
    };
    checkRole();

    const fetchClasses = async () => {
      const todayKey = getTodayKey();
      const snapshot = await getDocs(collection(db, 'students'));
      const classList: ScheduledClass[] = [];

      snapshot.forEach((doc) => {
        const student = doc.data();
        const name = student.name || 'Unnamed';
        const grade = student.grade || '';
        const schedule = student.weeklySchedule || {};
        const todayClass = schedule[todayKey];
        if (todayClass) {
          classList.push({
            studentName: name,
            grade,
            subject: todayClass.Subject || '',
            time: todayClass.Time || '',
            teacher: todayClass.teacher || todayClass.Teacher || '',
            zoomLink: todayClass.zoomLink || '',
          });
        }
      });
      setClasses(classList);
      setLoading(false);
    };
    fetchClasses();

    // Fetch recent reschedule requests
    const fetchRequests = async () => {
      const reqQ = query(collection(db, 'rescheduleRequests'), orderBy('createdAt', 'desc'), limit(10));
      const reqSnap = await getDocs(reqQ);
      const reqs: RescheduleRequest[] = [];
      reqSnap.forEach(docSnap => {
        const d = docSnap.data();
        reqs.push({
          id: docSnap.id,
          studentName: d.studentName,
          grade: d.grade,
          subject: d.subject,
          teacherName: d.teacherName,
          previousSlot: d.previousSlot,
          requestedSlot: d.requestedSlot,
          status: d.status,
        });
      });
      setRequests(reqs);
      setRequestsLoading(false);
    };
    fetchRequests();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-6">📅 Today's Classes</h1>
        {loading ? (
          <p>Loading...</p>
        ) : classes.length === 0 ? (
          <p>No classes scheduled today.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls, idx) => (
              <div key={idx} className="bg-white rounded shadow p-6 flex flex-col gap-2 border border-gray-200">
                <div className="font-semibold text-lg">{cls.studentName} <span className="text-sm text-gray-500">(Grade {cls.grade})</span></div>
                <div><span className="font-medium">Subject:</span> {cls.subject}</div>
                <div><span className="font-medium">Time:</span> {cls.time}</div>
                <div><span className="font-medium">Teacher:</span> {cls.teacher}</div>
                <div>
                  <span className="font-medium">Zoom:</span>{' '}
                  {cls.zoomLink ? (
                    <a href={cls.zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Join Class</a>
                  ) : (
                    <span className="text-gray-400">No link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">🔄 Recent Reschedule Requests</h2>
          {requestsLoading ? (
            <p>Loading...</p>
          ) : requests.length === 0 ? (
            <p>No recent reschedule requests.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map((req) => (
                <div key={req.id} className="bg-white rounded shadow p-4 flex flex-col gap-2 border">
                  <div><span className="font-medium">Student:</span> {req.studentName} (Grade {req.grade}{req.subject ? `, ${req.subject}` : ''})</div>
                  <div><span className="font-medium">Teacher:</span> {req.teacherName}</div>
                  <div><span className="font-medium">Previous Slot:</span> {req.previousSlot?.day || 'N/A'}, {req.previousSlot?.date || 'N/A'}, {req.previousSlot?.time || 'N/A'}</div>
                  <div><span className="font-medium">Requested Slot:</span> {req.requestedSlot?.day || 'N/A'}, {req.requestedSlot?.date || 'N/A'}, {req.requestedSlot?.time || 'N/A'}</div>
                  <div><span className="font-medium">Status:</span> <span className={`font-bold ${req.status === 'approved' ? 'text-green-600' : req.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
