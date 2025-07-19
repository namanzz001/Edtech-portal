"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import TeacherSidebar from '@/components/TeacherSidebar';

interface WeeklyScheduleDay {
  Subject: string;
  Time: string;
  teacher: string;
  zoomLink: string;
}
interface Student {
  id: string;
  name: string;
  grade: string;
  country: string;
  subjects: string;
  weeklySchedule: { [day: string]: WeeklyScheduleDay };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
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
        setTeacherSubjects(teacherData.subjects || []);
        const assigned = teacherData.assignedStudents || [];
        const studentList: Student[] = [];
        for (const studentId of assigned) {
          const studentRef = doc(db, 'students', studentId);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            // Find intersection of teacher's and student's subjects
            let studentSubjects = '';
            if (studentData.subjects) {
              const sSubjects = studentData.subjects.split(',').map((s: string) => s.trim().toLowerCase());
              const tSubjects = (teacherData.subjects || []).map((s: string) => s.trim().toLowerCase());
              const intersection = sSubjects.filter((s: string) => tSubjects.includes(s));
              studentSubjects = intersection.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
            }
            studentList.push({
              id: studentId,
              name: studentData.name || '',
              grade: studentData.grade || '',
              country: studentData.country || '',
              subjects: studentSubjects,
              weeklySchedule: studentData.weeklySchedule || {},
            });
          }
        }
        setStudents(studentList);
        setLoading(false);
      });
    };
    fetchStudents();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/teacher/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <TeacherSidebar />
      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-4">👨‍🎓 My Students</h1>
        {loading ? <p>Loading...</p> : (
          students.length === 0 ? <p>No students assigned.</p> : (
            <div className="space-y-6">
              {students.map((student) => (
                <div key={student.id} className="border rounded-xl p-4 shadow bg-white">
                  <div className="font-semibold text-lg mb-1">{student.name} <span className="text-sm text-gray-500">(Grade {student.grade})</span></div>
                  <div><span className="font-medium">Country:</span> {student.country}</div>
                  <div><span className="font-medium">Subjects:</span> {student.subjects}</div>
                  <div className="mt-2">
                    <span className="font-semibold">Weekly Schedule:</span>
                    <table className="w-full text-left mt-1">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1">Day</th>
                          <th>Subject</th>
                          <th>Time</th>
                          <th>Teacher</th>
                          <th>Zoom</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(day => (
                          <tr key={day} className="border-b">
                            <td className="py-1">{day}</td>
                            <td>{student.weeklySchedule?.[day]?.Subject || ''}</td>
                            <td>{student.weeklySchedule?.[day]?.Time || ''}</td>
                            <td>{student.weeklySchedule?.[day]?.teacher || ''}</td>
                            <td>{student.weeklySchedule?.[day]?.zoomLink ? (
                              <a href={student.weeklySchedule[day].zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Join</a>
                            ) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
} 