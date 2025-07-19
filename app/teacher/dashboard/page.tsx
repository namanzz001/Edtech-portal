"use client";

import { useEffect, useState } from "react";
import React from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import TeacherSidebar from '@/components/TeacherSidebar';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ClassItem {
  day: string;
  studentName: string;
  className: string;
  subject: string;
  time: string;
  zoomLink: string;
  topic?: string; // Added topic field
  studentId?: string;
  date?: string; // Added date field
  classNumber?: number; // Added classNumber field
}

interface RescheduleRequest {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  previousSlot: { day: string; time: string; date?: string };
  requestedSlot: { day: string; time: string; date?: string };
  status: string;
  subject?: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<ClassItem[]>([]);
  const [todayClasses, setTodayClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [curriculumProgressMap, setCurriculumProgressMap] = useState<{ [studentId: string]: { [subject: string]: number } }>({});
  const [marking, setMarking] = useState<string | null>(null); // studentId_classNumber loading state
  const [showFormModal, setShowFormModal] = useState<{ cls: ClassItem, idx: number } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [studentHistory, setStudentHistory] = useState<{ [studentId: string]: any }>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modalForm, setModalForm] = useState<{ notesFile: File | null, feedback: string, hwFiles: File[], submitting: boolean }>({ notesFile: null, feedback: '', hwFiles: [], submitting: false });

  useEffect(() => {
    const fetchTeacherData = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace('/login');
          return;
        }
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() || userSnap.data().role !== 'teacher') {
          router.replace('/unauthorized');
          return;
        }
        const teacherId = userSnap.data().linked_id || user.uid;
        const teacherRef = doc(db, 'teachers', teacherId);
        const teacherSnap = await getDoc(teacherRef);
        if (!teacherSnap.exists()) {
          setLoading(false);
          return;
        }
        const teacherData = teacherSnap.data();
        setTeacherName(teacherData.name || '');

        // Find all students who have this teacher in their weeklySchedule
        const studentsSnap = await getDocs(collection(db, 'students'));
        const schedule: ClassItem[] = [];
        const progressMap: { [studentId: string]: { [subject: string]: number } } = {};
        studentsSnap.forEach((studentDoc) => {
          const student = studentDoc.data();
          const studentName = student.name || '';
          const ws = student.weeklySchedule || {};
          progressMap[studentDoc.id] = student.curriculumProgress || {};
          Object.entries(ws).forEach(([day, entry]: any) => {
            if (entry.teacher === teacherData.name) {
              schedule.push({
                day,
                studentName,
                className: entry.className || '',
                subject: entry.Subject || '',
                time: entry.Time || '',
                zoomLink: entry.zoomLink || '',
                topic: entry.topic || entry.Topic || '',
                studentId: studentDoc.id,
                date: entry.date || '',
                classNumber: entry.classNumber || null,
              });
            }
          });
        });
        setWeeklySchedule(schedule);
        setCurriculumProgressMap(progressMap);
        // Today's classes
        const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
        setTodayClasses(schedule.filter(cls => cls.day === todayKey));

        // Fetch reschedule requests for this teacher
        const q = query(collection(db, 'rescheduleRequests'), where('teacherId', '==', teacherId), where('status', '==', 'pending'));
        const reqSnap = await getDocs(q);
        const reqs: RescheduleRequest[] = [];
        reqSnap.forEach(docSnap => {
          const d = docSnap.data();
          reqs.push({
            id: docSnap.id,
            studentId: d.studentId,
            studentName: d.studentName,
            grade: d.grade,
            previousSlot: d.previousSlot,
            requestedSlot: d.requestedSlot,
            status: d.status,
            subject: d.subject,
          });
        });
        setRequests(reqs);
        setRequestsLoading(false);
        setLoading(false);
      });
    };
    fetchTeacherData();
  }, []);

  // Fetch completedClasses for all assigned students when history tab is selected
  useEffect(() => {
    if (activeTab !== 'history' || weeklySchedule.length === 0) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      const studentIds = Array.from(new Set(weeklySchedule.map(cls => cls.studentId).filter((id): id is string => typeof id === 'string' && !!id)));
      const newHistory: { [studentId: string]: any } = {};
      for (const studentId of studentIds) {
        try {
          const studentRef = doc(db, 'students', String(studentId));
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            newHistory[studentId] = {
              completedClasses: studentSnap.data().completedClasses || {},
              subjects: (studentSnap.data().subjects || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean),
              name: studentSnap.data().name || '',
            };
          }
        } catch (e) {
          // Defensive: skip on error
        }
      }
      setStudentHistory(newHistory);
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [activeTab, weeklySchedule]);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/teacher/login');
  };

  const handleRequestAction = async (id: string, action: 'approved' | 'rejected') => {
    const reqRef = doc(db, 'rescheduleRequests', id);
    if (action === 'approved') {
      // Fetch the request
      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        const req = reqSnap.data();
        // Update student's weeklySchedule
        const studentRef = doc(db, 'students', req.studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          const ws = { ...(studentData.weeklySchedule || {}) };
          // Remove previous slot
          let prevDetails = {};
          if (ws[req.previousSlot.day] && ws[req.previousSlot.day].Time === req.previousSlot.time) {
            prevDetails = { ...ws[req.previousSlot.day] };
            ws[req.previousSlot.day] = {};
          }
          // Add new slot, copying all details from previous slot
          ws[req.requestedSlot.day] = {
            ...prevDetails,
            Time: req.requestedSlot.time,
            teacher: req.teacherName,
            isRescheduleApproved: true,
          };
          await updateDoc(studentRef, { weeklySchedule: ws });
        }
        // Update teacher's freeSlots
        const teacherRef = doc(db, 'teachers', req.teacherId);
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
          const teacherData = teacherSnap.data();
          const freeSlots = { ...(teacherData.freeSlots || {}) };
          // Remove the requested slot from freeSlots
          freeSlots[req.requestedSlot.day] = (freeSlots[req.requestedSlot.day] || []).filter((t: string) => t !== req.requestedSlot.time);
          // Optionally, add the previous slot back to freeSlots
          if (!freeSlots[req.previousSlot.day]) freeSlots[req.previousSlot.day] = [];
          if (!freeSlots[req.previousSlot.day].includes(req.previousSlot.time)) {
            freeSlots[req.previousSlot.day].push(req.previousSlot.time);
          }
          await updateDoc(teacherRef, { freeSlots });
        }
      }
    }
    await updateDoc(reqRef, { status: action });
    setRequests((prev) => prev.filter(r => r.id !== id));
  };

  // Helper to get class number for attended logic
  function getClassNumber(cls: ClassItem, idx: number) {
    // Try to use classNumber if available, else fallback to idx+1
    return cls.classNumber || idx + 1;
  }

  // Helper to check if class is attended
  function isAttended(cls: ClassItem, idx: number) {
    const progress = curriculumProgressMap[cls.studentId || '']?.[cls.subject.toLowerCase()] || 0;
    const classNum = Number(getClassNumber(cls, idx));
    return classNum <= Number(progress);
  }

  // Helper to check if class is the next to be marked as done
  function isNextToAttend(cls: ClassItem, idx: number) {
    const progress = curriculumProgressMap[cls.studentId || '']?.[cls.subject] || 0;
    return getClassNumber(cls, idx) === progress + 1;
  }

  // Helper to check if class time has started
  function isClassTimeStarted(cls: ClassItem) {
    if (!cls.date || !cls.time) return false;
    // Combine date and time into a Date object
    const [year, month, day] = cls.date.split('-'); // yyyy-mm-dd
    let [time, modifier] = cls.time.trim().split(' '); // e.g. 03:00 PM
    let [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    let minutes = parseInt(minutesStr, 10);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const classDate = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes);
    return new Date() >= classDate;
  }

  // Modal submit handler
  const handleModalSubmit = async () => {
    if (!showFormModal) return;
    setModalForm(f => ({ ...f, submitting: true }));
    const { cls, idx } = showFormModal;
    if (!cls.studentId) return;
    const studentRef = doc(db, 'students', String(cls.studentId));
    const studentSnap = await getDoc(studentRef);
    let notesUrl = '';
    let hwUrls: string[] = [];
    // Upload notes file if any
    if (modalForm.notesFile) {
      const notesRef = ref(storage, `student_notes/${cls.studentId}_${cls.subject}_${cls.classNumber || idx + 1}_${modalForm.notesFile.name}`);
      await uploadBytes(notesRef, modalForm.notesFile);
      notesUrl = await getDownloadURL(notesRef);
    }
    // Upload homework files if any
    if (modalForm.hwFiles && modalForm.hwFiles.length > 0) {
      for (const file of modalForm.hwFiles) {
        const hwRef = ref(storage, `student_hw_feedback/${cls.studentId}_${cls.subject}_${cls.classNumber || idx + 1}_${file.name}`);
        await uploadBytes(hwRef, file);
        const url = await getDownloadURL(hwRef);
        hwUrls.push(url);
      }
    }
    if (studentSnap.exists()) {
      const studentData = studentSnap.data();
      const curriculumProgress = { ...(studentData.curriculumProgress || {}) };
      const completedClasses = { ...(studentData.completedClasses || {}) };
      const subjectKey = (cls.subject || '').toLowerCase();
      const classNum = cls.classNumber || idx + 1;
      curriculumProgress[subjectKey] = classNum;
      if (!completedClasses[subjectKey]) completedClasses[subjectKey] = {};
      completedClasses[subjectKey][classNum] = {
        timestamp: Date.now(),
        notesUrl: notesUrl || undefined,
        feedback: modalForm.feedback,
        hwFeedbackUrls: hwUrls.length > 0 ? hwUrls : undefined,
        topic: cls.topic || '',
      };
      await updateDoc(studentRef, { curriculumProgress, completedClasses });
      // Refresh progress map
      const updatedStudentSnap = await getDoc(studentRef);
      if (updatedStudentSnap.exists()) {
        setCurriculumProgressMap(prev => ({
          ...prev,
          [cls.studentId || '']: updatedStudentSnap.data().curriculumProgress || {}
        }));
      }
    }
    setModalForm({ notesFile: null, feedback: '', hwFiles: [], submitting: false });
    setMarking(null);
    setShowFormModal(null);
  };

  // Before rendering the table, sort weeklySchedule by date and time
  const sortedWeeklySchedule = [...weeklySchedule].sort((a, b) => {
    if (!a.date || !a.time) return 1;
    if (!b.date || !b.time) return -1;
    const aDate = new Date(a.date + ' ' + a.time);
    const bDate = new Date(b.date + ' ' + b.time);
    return aDate.getTime() - bDate.getTime();
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <TeacherSidebar />
      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-4">👋 Hello, {teacherName || '...'}!</h1>
        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          <button
            className={`pb-2 px-4 font-semibold ${activeTab === 'schedule' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab('schedule')}
          >
            Weekly Schedule
          </button>
          <button
            className={`pb-2 px-4 font-semibold ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab('history')}
          >
            Class History
          </button>
        </div>
        {/* Tab Content */}
        {activeTab === 'schedule' ? (
          <>
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-2">📅 Weekly Schedule</h2>
              <div className="bg-white rounded shadow p-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Day</th>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Subject</th>
                      <th>Topic</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Zoom</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWeeklySchedule.map((cls, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{cls.day}</td>
                        <td>{cls.studentName}</td>
                        <td>{cls.className}</td>
                        <td>{cls.subject}</td>
                        <td>{cls.topic || ''}</td>
                        <td>{cls.date || ''}</td>
                        <td>{cls.time}</td>
                        <td>
                          <a href={cls.zoomLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Join</a>
                        </td>
                        <td>
                          {isAttended(cls, idx) ? (
                            <span className="px-2 py-1 rounded bg-green-400 text-white">Marked</span>
                          ) : (
                            <button
                              onClick={() => setShowFormModal({ cls, idx })}
                              className={`px-2 py-1 rounded ${isClassTimeStarted(cls) ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} ${marking === cls.studentId + '_' + (cls.classNumber || idx + 1) ? 'opacity-50 cursor-wait' : ''}`}
                              disabled={!isClassTimeStarted(cls) || marking === cls.studentId + '_' + (cls.classNumber || idx + 1)}
                            >
                              {marking === cls.studentId + '_' + (cls.classNumber || idx + 1) ? 'Marking...' : 'Mark as Done'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Today's Classes and Reschedule Requests */}
            <div className="flex gap-8">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">📍 Today's Classes</h2>
                {todayClasses.length === 0 ? (
                  <p>No classes scheduled today.</p>
                ) : (
                  <div className="space-y-4">
                    {todayClasses.map((cls, idx) => (
                      <div key={idx} className="bg-white rounded shadow p-4 flex flex-col gap-2 border">
                        <div><span className="font-medium">Student:</span> {cls.studentName}</div>
                        <div><span className="font-medium">Class:</span> {cls.className}</div>
                        <div><span className="font-medium">Subject:</span> {cls.subject}</div>
                        <div><span className="font-medium">Time:</span> {cls.time}</div>
                        <div>
                          <span className="font-medium">Zoom:</span>{' '}
                          <a href={cls.zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Join Class</a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Reschedule Requests Section */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">🔄 Slot Change Requests</h2>
                {requestsLoading ? (
                  <p>Loading...</p>
                ) : requests.length === 0 ? (
                  <p>No pending requests.</p>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div key={req.id} className="bg-white rounded shadow p-4 flex flex-col gap-2 border">
                        <div><span className="font-medium">Student:</span> {req.studentName} (Grade {req.grade}{req.subject ? `, ${req.subject}` : ''})</div>
                        <div><span className="font-medium">Previous Slot:</span> {req.previousSlot?.day || 'N/A'}, {req.previousSlot?.date || 'N/A'}, {req.previousSlot?.time || 'N/A'}</div>
                        <div><span className="font-medium">Requested Slot:</span> {req.requestedSlot?.day || 'N/A'}, {req.requestedSlot?.date || 'N/A'}, {req.requestedSlot?.time || 'N/A'}</div>
                        <div>
                          <button
                            onClick={() => handleRequestAction(req.id, 'approved')}
                            className="text-blue-600 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.id, 'rejected')}
                            className="text-red-600 hover:underline ml-2"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Implementation of history tab content */}
          </div>
        )}
      </div>
    </div>
  );
}