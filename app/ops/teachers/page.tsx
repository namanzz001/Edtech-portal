"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Sidebar from "../../../components/OpsSidebar";
import { useRouter } from 'next/navigation';

interface Teacher {
  id: string;
  name: string;
  subjects: string;
  email: string;
  phone: string;
  assignedStudents: string[];
}
interface Student {
  id: string;
  name: string;
  grade: string;
}

export default function OpsTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Teacher & { password: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Role protection
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
    fetchTeachers();
    fetchStudents();
  }, []);

  async function fetchTeachers() {
    setLoading(true);
    const snap = await getDocs(collection(db, "teachers"));
    const out: Teacher[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      out.push({
        id: doc.id,
        name: d.name || "",
        subjects: (d.subjects || []).join ? d.subjects.join(", ") : d.subjects || "",
        email: d.email || "",
        phone: d.phone || "",
        assignedStudents: d.assignedStudents || [],
      });
    });
    setTeachers(out);
    setLoading(false);
  }

  async function fetchStudents() {
    const snap = await getDocs(collection(db, "students"));
    const out: Student[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      out.push({
        id: doc.id,
        name: d.name || "",
        grade: d.grade || "",
      });
    });
    setStudents(out);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleAssignStudent(teacherId: string, studentId: string) {
    setForm((prev) => {
      const assigned = prev.assignedStudents || [];
      return {
        ...prev,
        assignedStudents: assigned.includes(studentId)
          ? assigned.filter((id) => id !== studentId)
          : [...assigned, studentId],
      };
    });
  }

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password || !form.name || !form.subjects) {
      setError("Name, subjects, email, and password are required.");
      return;
    }
    try {
      // Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = userCred.user.uid;
      // Add to teachers
      await setDoc(doc(db, "teachers", uid), {
        name: form.name,
        subjects: form.subjects.split(",").map((s) => s.trim()),
        email: form.email,
        phone: form.phone || "",
        assignedStudents: form.assignedStudents || [],
      });
      // Add to users
      await setDoc(doc(db, "users", uid), {
        name: form.name,
        email: form.email,
        role: "teacher",
        linked_id: uid,
        uid,
      });
      // Update assigned students' weeklySchedule
      for (const studentId of form.assignedStudents || []) {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          // Assign teacher to all days (or you can customize)
          const ws = studentData.weeklySchedule || {};
          Object.keys(ws).forEach((day) => {
            ws[day].teacher = form.name;
          });
          await updateDoc(studentRef, { weeklySchedule: ws });
        }
      }
      setShowAdd(false);
      setForm({});
      fetchTeachers();
    } catch (err: any) {
      setError(err.message || "Failed to add teacher.");
    }
  }

  function handleEdit(teacher: Teacher) {
    setEditingId(teacher.id);
    setForm({ ...teacher, subjects: teacher.subjects });
  }

  async function handleUpdateTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    await updateDoc(doc(db, "teachers", editingId), {
      name: form.name,
      subjects: form.subjects?.split(",").map((s) => s.trim()),
      email: form.email,
      phone: form.phone,
      assignedStudents: form.assignedStudents || [],
    });
    await updateDoc(doc(db, "users", editingId), {
      name: form.name,
      email: form.email,
    });
    // Update assigned students' weeklySchedule
    for (const studentId of form.assignedStudents || []) {
      const studentRef = doc(db, "students", studentId);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        const ws = studentData.weeklySchedule || {};
        Object.keys(ws).forEach((day) => {
          ws[day].teacher = form.name;
        });
        await updateDoc(studentRef, { weeklySchedule: ws });
      }
    }
    setEditingId(null);
    setForm({});
    fetchTeachers();
  }

  async function handleDeleteTeacher(id: string) {
    await deleteDoc(doc(db, "teachers", id));
    await deleteDoc(doc(db, "users", id));
    fetchTeachers();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-6">👩‍🏫 Teachers</h1>
        <button onClick={() => { setShowAdd(true); setForm({ assignedStudents: [] }); }} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded">+ Add Teacher</button>
        {showAdd && (
          <form onSubmit={handleAddTeacher} className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-2 border max-w-xl">
            <input name="name" placeholder="Name" value={form.name || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="subjects" placeholder="Subjects (comma separated)" value={form.subjects || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="email" type="email" placeholder="Email" value={form.email || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="password" type="password" placeholder="Password" value={form.password || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="phone" placeholder="Phone" value={form.phone || ""} onChange={handleFormChange} className="p-2 border rounded" />
            <div className="font-semibold mt-2">Assign Students</div>
            <div className="flex flex-wrap gap-2">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={form.assignedStudents?.includes(student.id) || false}
                    onChange={() => handleAssignStudent("", student.id)}
                  />
                  {student.name} (Grade {student.grade})
                </label>
              ))}
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
              <button type="button" onClick={() => { setShowAdd(false); setForm({}); }} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
            </div>
          </form>
        )}
        {loading ? <p>Loading...</p> : (
          <div className="space-y-4">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="bg-white p-4 rounded shadow flex flex-col gap-2 border max-w-xl">
                {editingId === teacher.id ? (
                  <form onSubmit={handleUpdateTeacher} className="flex flex-col gap-2">
                    <input name="name" placeholder="Name" value={form.name || ""} onChange={handleFormChange} className="p-2 border rounded" required />
                    <input name="subjects" placeholder="Subjects (comma separated)" value={form.subjects || ""} onChange={handleFormChange} className="p-2 border rounded" required />
                    <input name="email" type="email" placeholder="Email" value={form.email || ""} onChange={handleFormChange} className="p-2 border rounded" required />
                    <input name="phone" placeholder="Phone" value={form.phone || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <div className="font-semibold mt-2">Assign Students</div>
                    <div className="flex flex-wrap gap-2">
                      {students.map((student) => (
                        <label key={student.id} className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={form.assignedStudents?.includes(student.id) || false}
                            onChange={() => handleAssignStudent(teacher.id, student.id)}
                          />
                          {student.name} (Grade {student.grade})
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Update</button>
                      <button type="button" onClick={() => { setEditingId(null); setForm({}); }} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="font-semibold text-lg">{teacher.name}</div>
                    <div><span className="font-medium">Subjects:</span> {teacher.subjects}</div>
                    <div><span className="font-medium">Email:</span> {teacher.email}</div>
                    <div><span className="font-medium">Phone:</span> {teacher.phone}</div>
                    <div><span className="font-medium">Assigned Students:</span> {teacher.assignedStudents.map(id => {
                      const s = students.find(stu => stu.id === id);
                      return s ? `${s.name} (Grade ${s.grade})` : id;
                    }).join(", ") || 'None'}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleEdit(teacher)} className="bg-yellow-500 text-white px-4 py-2 rounded">Edit</button>
                      <button onClick={() => handleDeleteTeacher(teacher.id)} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 