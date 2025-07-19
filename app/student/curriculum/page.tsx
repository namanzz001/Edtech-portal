'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CurriculumClass {
  id: string;
  classNumber: number;
  title: string;
  description: string;
  homeworkLink?: string;
  notesLink?: string;
  recordingLink?: string;
}

export default function StudentCurriculumPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [curriculumProgress, setCurriculumProgress] = useState<{ [subject: string]: number }>({});
  const [activeTab, setActiveTab] = useState<'curriculum' | 'history'>('curriculum');
  const [completedClasses, setCompletedClasses] = useState<any>({});
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [showCheckedHW, setShowCheckedHW] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchCurriculum = async () => {
      console.log('Effect started');
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.log('No user, redirecting');
          router.replace('/login');
          return;
        }
        console.log('User found:', user.uid);
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists() || userSnap.data().role !== 'student') {
            console.log('User doc not found or not student:', userSnap.exists(), userSnap.data());
            router.replace('/unauthorized');
            return;
          }
          console.log('User doc found:', userSnap.data());
          const linkedId = userSnap.data().linked_id;
          if (!linkedId) {
            console.log('No linked_id found in user document:', userSnap.data());
            return;
          }
          console.log('Found linked_id:', linkedId);
          const studentRef = doc(db, 'students', linkedId);
          const studentSnap = await getDoc(studentRef);
          if (!studentSnap.exists()) {
            console.log('No student document found for linked_id:', linkedId);
            return;
          }
          const studentData = studentSnap.data();
          console.log('Fetched studentData:', studentData);
          setStudentName(studentData.name);
          const gradeValue = studentData.grade?.toString().toLowerCase().trim() || '1';
          setGrade(gradeValue);

          // Get subjects from the 'subjects' field (comma-separated string)
          const subjectArr = (studentData.subjects || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
          setSubjects(subjectArr);
          setSelectedSubject(subjectArr[0] || '');
          setCurriculumProgress(studentData.curriculumProgress || {});
          setCompletedClasses(studentData.completedClasses || {});
          let curriculumId = '';
          if (subjectArr[0] === 'scratch' || subjectArr[0] === 'python') {
            curriculumId = `${subjectArr[0]}_coding`;
          } else {
            curriculumId = `grade${gradeValue}_${subjectArr[0] || 'math'}`;
          }
          console.log('Detected curriculumId:', curriculumId);
          const curriculumRef = collection(db, 'curriculum', curriculumId, 'classes');
          const curriculumSnap = await getDocs(curriculumRef);

          const classList: CurriculumClass[] = [];
          curriculumSnap.forEach((doc) => {
            classList.push({ id: doc.id, ...doc.data() } as CurriculumClass);
          });
          console.log('Fetched classes:', classList);
          classList.sort((a, b) => a.classNumber - b.classNumber);
          setClasses(classList);
        } catch (err) {
          console.error('Error fetching curriculum:', err);
        } finally {
          setLoading(false);
        }
      });
    };

    fetchCurriculum();
  }, []);

  useEffect(() => {
    if (!grade || !selectedSubject) return;
    setLoading(true);
    const fetchCurriculum = async () => {
      let curriculumId = '';
      if (selectedSubject === 'scratch' || selectedSubject === 'python') {
        curriculumId = `${selectedSubject}_coding`;
      } else {
        curriculumId = `grade${grade}_${selectedSubject}`;
      }
      const curriculumRef = collection(db, 'curriculum', curriculumId, 'classes');
      const curriculumSnap = await getDocs(curriculumRef);
      const classList: CurriculumClass[] = [];
      curriculumSnap.forEach((doc) => {
        classList.push({ id: doc.id, ...doc.data() } as CurriculumClass);
      });
      classList.sort((a, b) => a.classNumber - b.classNumber);
      setClasses(classList);
      setLoading(false);
    };
    fetchCurriculum();
  }, [grade, selectedSubject]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-6">
        <h2 className="text-xl font-bold mb-8">
          🌟 {loading ? "Loading..." : studentName ? `${studentName}’s Debe Zone` : "Debe Student"}
        </h2>
        <ul className="space-y-4">
          <li>
            <Link href="/student/dashboard" className="hover:underline">Dashboard</Link>
          </li>
          <li>
            <Link href="/student/curriculum" className="hover:underline">Curriculum</Link>
          </li>
          <li>
            <Link href="/student/reschedule" className="hover:underline">Reschedule</Link>
          </li>
          <li>
            <button onClick={() => auth.signOut()} className="hover:underline">Logout</button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-4">📘 Curriculum for {studentName || '...'}</h1>
        {subjects.length > 1 && (
          <div className="mb-6">
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="p-2 rounded border">
              {subjects.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        )}
        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          <button
            className={`pb-2 px-4 font-semibold ${activeTab === 'curriculum' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab('curriculum')}
          >
            Curriculum
          </button>
          <button
            className={`pb-2 px-4 font-semibold ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500'}`}
            onClick={() => setActiveTab('history')}
          >
            Class History
          </button>
        </div>
        {/* Tab Content */}
        {activeTab === 'curriculum' ? (
          loading ? (
            <p>Loading...</p>
          ) : (
            (() => {
              let progressKey = selectedSubject;
              const progress = curriculumProgress[progressKey] || 0;
              const visibleClasses = classes.filter(cls => cls.classNumber <= progress);
              return visibleClasses.length > 0 ? (
                <div className="space-y-4">
                  {visibleClasses.map(nextClass => {
                    // Find completed class info for this class number
                    const completedInfo = completedClasses?.[progressKey]?.[nextClass.classNumber] || {};
                    return (
                      <div key={nextClass.id} className="border rounded-xl p-4 shadow bg-white">
                        <h2 className="text-lg font-semibold mb-1">
                          Class {nextClass.classNumber}: {nextClass.title}
                        </h2>
                        <p className="mb-2">{nextClass.description}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          {nextClass.homeworkLink && (
                            <a
                              href={nextClass.homeworkLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              📝 Homework
                            </a>
                          )}
                          {nextClass.notesLink && (
                            <a
                              href={nextClass.notesLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              📄 Notes
                            </a>
                          )}
                          {/* Teacher uploaded notes (optional) */}
                          {completedInfo.notesUrl && (
                            <a
                              href={completedInfo.notesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 bg-green-700 text-white rounded hover:bg-green-800"
                            >
                              📝 Teacher Notes
                            </a>
                          )}
                          {/* Teacher feedback (required) */}
                          {completedInfo.feedback && (
                            <button
                              onClick={() => setShowFeedback(completedInfo.feedback)}
                              className="px-4 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            >
                              💬 Feedback
                            </button>
                          )}
                          {/* Teacher uploaded checked homework (optional, multiple) */}
                          {completedInfo.hwFeedbackUrls && Array.isArray(completedInfo.hwFeedbackUrls) && completedInfo.hwFeedbackUrls.length > 0 && (
                            <button
                              onClick={() => setShowCheckedHW(completedInfo.hwFeedbackUrls)}
                              className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                              📎 Checked HW
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Feedback Modal */}
                  {showFeedback && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                        <h2 className="text-xl font-bold mb-4">Class Feedback</h2>
                        <div className="mb-4 text-black whitespace-pre-line">{showFeedback}</div>
                        <button onClick={() => setShowFeedback(null)} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
                      </div>
                    </div>
                  )}
                  {/* Checked HW Modal */}
                  {showCheckedHW && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                        <h2 className="text-xl font-bold mb-4">Checked Homework</h2>
                        <ul className="mb-4 text-black list-disc pl-5">
                          {showCheckedHW.map((url, idx) => (
                            <li key={url}>
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download File {showCheckedHW.length > 1 ? idx + 1 : ''}</a>
                            </li>
                          ))}
                        </ul>
                        <button onClick={() => setShowCheckedHW(null)} className="bg-purple-600 text-white px-4 py-2 rounded">Close</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">No curriculum available yet. Please attend your scheduled class.</div>
              );
            })()
          )
        ) : (
          // Class History Tab
          (() => {
            const subjectHistory = completedClasses?.[selectedSubject] || {};
            const historyRows = Object.entries(subjectHistory)
              .map(([classNumber, info]: any) => {
                const classNum = Number(classNumber);
                const classInfo = classes.find(cls => cls.classNumber === classNum);
                return {
                  classNumber: classNum,
                  title: classInfo?.title || info?.topic || '—',
                  date: info?.timestamp ? new Date(info.timestamp.seconds ? info.timestamp.seconds * 1000 : info.timestamp).toLocaleDateString() : '—',
                };
              })
              .sort((a, b) => a.classNumber - b.classNumber);
            return historyRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded shadow">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Class #</th>
                      <th className="py-2 px-4 border-b">Title/Topic</th>
                      <th className="py-2 px-4 border-b">Date Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map(row => (
                      <tr key={row.classNumber}>
                        <td className="py-2 px-4 border-b text-center">{row.classNumber}</td>
                        <td className="py-2 px-4 border-b">{row.title}</td>
                        <td className="py-2 px-4 border-b">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500">No completed classes yet.</div>
            );
          })()
        )}
      </div>
    </div>
  );
}
