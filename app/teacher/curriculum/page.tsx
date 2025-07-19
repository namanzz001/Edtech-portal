"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import TeacherSidebar from '@/components/TeacherSidebar';

interface CurriculumClass {
  id: string;
  classNumber: number;
  title: string;
  description: string;
  homeworkLink?: string;
  notesLink?: string;
}

export default function TeacherCurriculumPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectGradeOptions, setSubjectGradeOptions] = useState<{ subject: string, grade?: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<{ subject: string, grade?: string } | null>(null);

  useEffect(() => {
    const fetchTeacher = async () => {
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
        // Find all unique subject-grade pairs from assigned students
        const assigned = teacherData.assignedStudents || [];
        const optionsSet = new Set<string>();
        const optionsArr: { subject: string, grade?: string }[] = [];
        for (const studentId of assigned) {
          const studentRef = doc(db, 'students', studentId);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            const subjects = (studentData.subjects || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            for (const subject of subjects) {
              if (subject === 'math' || subject === 'english') {
                const grade = studentData.grade?.toString();
                const key = `${subject}_${grade}`;
                if (!optionsSet.has(key)) {
                  optionsSet.add(key);
                  optionsArr.push({ subject, grade });
                }
              } else if (subject === 'scratch' || subject === 'python') {
                if (!optionsSet.has(subject)) {
                  optionsSet.add(subject);
                  optionsArr.push({ subject });
                }
              }
            }
          }
        }
        setSubjectGradeOptions(optionsArr);
        setSelectedOption(optionsArr[0] || null);
        setLoading(false);
      });
    };
    fetchTeacher();
  }, []);

  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!selectedOption) return;
      setLoading(true);
      let curriculumId = '';
      if (selectedOption.subject === 'scratch' || selectedOption.subject === 'python') {
        curriculumId = `${selectedOption.subject}_coding`;
      } else {
        curriculumId = `grade${selectedOption.grade}_${selectedOption.subject}`;
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
  }, [selectedOption]);

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
        <h1 className="text-2xl font-bold mb-4">📚 Curriculum for {teacherName || '...'}</h1>
        <div className="flex gap-4 mb-6">
          <select
            value={selectedOption ? `${selectedOption.subject}_${selectedOption.grade || ''}` : ''}
            onChange={e => {
              const [subject, grade] = e.target.value.split('_');
              setSelectedOption(grade ? { subject, grade } : { subject });
            }}
            className="p-2 rounded border"
          >
            {subjectGradeOptions.map(opt => (
              <option key={`${opt.subject}_${opt.grade || ''}`} value={`${opt.subject}_${opt.grade || ''}`}>
                {opt.subject.charAt(0).toUpperCase() + opt.subject.slice(1)}{opt.grade ? ` (Grade ${opt.grade})` : ''}
              </option>
            ))}
          </select>
        </div>
        {loading ? <p>Loading...</p> : (
          classes.length === 0 ? <p>No classes found.</p> : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <div key={cls.id} className="border rounded-xl p-4 shadow bg-white">
                  <h2 className="text-lg font-semibold mb-1">
                    Class {cls.classNumber}: {cls.title}
                  </h2>
                  <p className="mb-2">{cls.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    {cls.homeworkLink && (
                      <a
                        href={cls.homeworkLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        📝 Homework
                      </a>
                    )}
                    {cls.notesLink && (
                      <a
                        href={cls.notesLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        📄 Notes
                      </a>
                    )}
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