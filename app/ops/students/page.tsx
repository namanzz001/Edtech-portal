"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import Sidebar from "../../../components/OpsSidebar";
import { useRouter } from 'next/navigation';
import { timeSlots } from '../../../lib/timeSlots';

interface WeeklyScheduleDay {
  Subject: string;
  Time: string;
  teacher: string;
  zoomLink: string;
  topic?: string;
  date?: string; // Added date field
  classNumber?: number; // Added classNumber field
}
interface Student {
  id: string;
  name: string;
  grade: string;
  email: string;
  phone: string;
  subjects: string;
  country: string;
  assignedTeacher: string;
  weeklySchedule?: { [day: string]: WeeklyScheduleDay };
}

export default function OpsStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Student & { password: string; weeklySchedule?: { [day: string]: WeeklyScheduleDay } }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const defaultSchedule = DAYS.reduce((acc, day) => {
    acc[day] = { Subject: '', Time: '', teacher: '', zoomLink: '', topic: '', date: '', classNumber: undefined };
    return acc;
  }, {} as any);

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
    fetchStudents();
    // Fetch teachers for dropdown
    const fetchTeachers = async () => {
      const snap = await getDocs(collection(db, "teachers"));
      const names: string[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.name) names.push(d.name);
      });
      setTeacherOptions(names);
    };
    fetchTeachers();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    const snap = await getDocs(collection(db, "students"));
    const out: Student[] = [];
    snap.forEach((doc) => {
      const d = doc.data();
      out.push({
        id: doc.id,
        name: d.name || "",
        grade: d.grade || "",
        email: d.email || "",
        phone: d.phone || "",
        subjects: d.subjects || "",
        country: d.country || "",
        assignedTeacher: d.assignedTeacher || "",
        weeklySchedule: d.weeklySchedule || defaultSchedule,
      });
    });
    setStudents(out);
    setLoading(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleScheduleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const [_, day, field] = e.target.name.split(".");
    setForm((prev) => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [day]: {
          Subject: prev.weeklySchedule?.[day]?.Subject || "",
          Time: prev.weeklySchedule?.[day]?.Time || "",
          teacher: prev.weeklySchedule?.[day]?.teacher || "",
          zoomLink: prev.weeklySchedule?.[day]?.zoomLink || "",
          topic: prev.weeklySchedule?.[day]?.topic || "",
          date: prev.weeklySchedule?.[day]?.date || "",
          classNumber: prev.weeklySchedule?.[day]?.classNumber || undefined,
          [field]: e.target.value,
        },
      },
    }));
  }

  function cleanWeeklySchedule(weeklySchedule: any) {
    const cleaned: any = {};
    for (const day in weeklySchedule) {
      cleaned[day] = { ...weeklySchedule[day] };
      if (cleaned[day].classNumber === undefined || cleaned[day].classNumber === '') {
        delete cleaned[day].classNumber;
      }
      Object.keys(cleaned[day]).forEach(key => {
        if (cleaned[day][key] === undefined) delete cleaned[day][key];
      });
    }
    return cleaned;
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password || !form.name || !form.grade) {
      setError("Name, grade, email, and password are required.");
      return;
    }
    try {
      // Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = userCred.user.uid;
      // Add to students
      await setDoc(doc(db, "students", uid), {
        name: form.name,
        grade: form.grade,
        email: form.email,
        phone: form.phone || "",
        subjects: form.subjects || "",
        country: form.country || "",
        assignedTeacher: form.assignedTeacher || "",
        weeklySchedule: cleanWeeklySchedule(form.weeklySchedule || defaultSchedule),
        createdAt: new Date(),
      });
      // Add to users
      await setDoc(doc(db, "users", uid), {
        name: form.name,
        email: form.email,
        role: "student",
        linked_id: uid,
        uid,
      });
      setShowAdd(false);
      setForm({});
      fetchStudents();
    } catch (err: any) {
      setError(err.message || "Failed to add student.");
    }
  }

  function handleEdit(student: Student) {
    setEditingId(student.id);
    setForm({ ...student, weeklySchedule: student.weeklySchedule || defaultSchedule });
  }

  async function handleUpdateStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    await updateDoc(doc(db, "students", editingId), {
      name: form.name,
      grade: form.grade,
      email: form.email,
      phone: form.phone,
      subjects: form.subjects,
      country: form.country,
      assignedTeacher: form.assignedTeacher,
      weeklySchedule: cleanWeeklySchedule(form.weeklySchedule || defaultSchedule),
    });
    await updateDoc(doc(db, "users", editingId), {
      name: form.name,
      email: form.email,
    });
    setEditingId(null);
    setForm({});
    fetchStudents();
  }

  async function handleDeleteStudent(id: string) {
    await deleteDoc(doc(db, "students", id));
    await deleteDoc(doc(db, "users", id));
    // Optionally: delete from Auth (requires admin SDK for full security)
    fetchStudents();
  }

  // Helper to get valid class numbers for a subject and grade
  function getClassNumberOptions(subject: string, grade: string) {
    const g = parseInt(grade, 10);
    if (subject.toLowerCase() === 'math') {
      if (g >= 1 && g <= 5) return Array.from({ length: 96 }, (_, i) => i + 1);
      if (g > 5) return Array.from({ length: 144 }, (_, i) => i + 1);
    }
    if (subject.toLowerCase() === 'coding') {
      return Array.from({ length: 96 }, (_, i) => i + 1);
    }
    return [];
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-6">👨‍🎓 Students</h1>
        <button onClick={() => { setShowAdd(true); setForm({}); }} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded">+ Add Student</button>
        {showAdd && (
          <form onSubmit={handleAddStudent} className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-2 border max-w-xl">
            <input name="name" placeholder="Name" value={form.name || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="grade" placeholder="Grade" value={form.grade || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="email" type="email" placeholder="Email" value={form.email || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="password" type="password" placeholder="Password" value={form.password || ""} onChange={handleFormChange} className="p-2 border rounded" required />
            <input name="phone" placeholder="Phone" value={form.phone || ""} onChange={handleFormChange} className="p-2 border rounded" />
            <input name="subjects" placeholder="Subjects (comma separated)" value={form.subjects || ""} onChange={handleFormChange} className="p-2 border rounded" />
            <input name="country" placeholder="Country" value={form.country || ""} onChange={handleFormChange} className="p-2 border rounded" />
            <input name="assignedTeacher" placeholder="Assigned Teacher" value={form.assignedTeacher || ""} onChange={handleFormChange} className="p-2 border rounded" />
            <div className="font-semibold mt-2 mb-1">Weekly Schedule</div>
            <table className="w-full border mb-2">
              <thead>
                <tr>
                  <th className="p-1 border">Day</th>
                  <th className="p-1 border">Date</th>
                  <th className="p-1 border">Subject</th>
                  <th className="p-1 border">Time</th>
                  <th className="p-1 border">Teacher</th>
                  <th className="p-1 border">Zoom Link</th>
                  <th className="p-1 border">Topic</th>
                  <th className="p-1 border">Class #</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td className="p-1 border font-semibold">{day}</td>
                    <td className="p-1 border">
                      <input
                        type="date"
                        name={`weeklySchedule.${day}.date`}
                        value={form.weeklySchedule?.[day]?.date || ''}
                        onChange={handleScheduleChange}
                        className="p-1 border rounded w-32"
                      />
                    </td>
                    <td className="p-1 border">
                      {form.subjects && form.subjects.split(',').map(s => s.trim()).filter(Boolean).length > 0 ? (
                        <select
                          name={`weeklySchedule.${day}.Subject`}
                          value={form.weeklySchedule?.[day]?.Subject || ''}
                          onChange={handleScheduleChange}
                          className="p-1 border rounded w-24"
                        >
                          <option value="">Select</option>
                          {form.subjects.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <input name={`weeklySchedule.${day}.Subject`} placeholder="Subject" value={form.weeklySchedule?.[day]?.Subject || ''} onChange={handleScheduleChange} className="p-1 border rounded w-24" />
                      )}
                    </td>
                    <td className="p-1 border">
                      {timeSlots.includes(form.weeklySchedule?.[day]?.Time || '') || !form.weeklySchedule?.[day]?.Time ? (
                        <select
                          name={`weeklySchedule.${day}.Time`}
                          value={form.weeklySchedule?.[day]?.Time || ''}
                          onChange={handleScheduleChange}
                          className="p-1 border rounded w-20"
                        >
                          <option value="">Select</option>
                          {timeSlots.map((t: string) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input name={`weeklySchedule.${day}.Time`} placeholder="Time" value={form.weeklySchedule?.[day]?.Time || ''} onChange={handleScheduleChange} className="p-1 border rounded w-20" />
                      )}
                    </td>
                    <td className="p-1 border">
                      {teacherOptions.length > 0 ? (
                        <select
                          name={`weeklySchedule.${day}.teacher`}
                          value={form.weeklySchedule?.[day]?.teacher || ''}
                          onChange={handleScheduleChange}
                          className="p-1 border rounded w-24"
                        >
                          <option value="">Select</option>
                          {teacherOptions.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input name={`weeklySchedule.${day}.teacher`} placeholder="Teacher" value={form.weeklySchedule?.[day]?.teacher || ''} onChange={handleScheduleChange} className="p-1 border rounded w-24" />
                      )}
                    </td>
                    <td className="p-1 border">
                      <input name={`weeklySchedule.${day}.zoomLink`} placeholder="Zoom Link" value={form.weeklySchedule?.[day]?.zoomLink || ''} onChange={handleScheduleChange} className="p-1 border rounded w-40" />
                    </td>
                    <td className="p-1 border">
                      <input name={`weeklySchedule.${day}.topic`} placeholder="Topic" value={form.weeklySchedule?.[day]?.topic || ''} onChange={handleScheduleChange} className="p-1 border rounded w-40" />
                    </td>
                    <td className="p-1 border">
                      {form.weeklySchedule?.[day]?.Subject && form.grade ? (
                        getClassNumberOptions(form.weeklySchedule[day].Subject, form.grade).length > 0 ? (
                          <select
                            name={`weeklySchedule.${day}.classNumber`}
                            value={form.weeklySchedule?.[day]?.classNumber || ''}
                            onChange={handleScheduleChange}
                            className="p-1 border rounded w-16"
                          >
                            <option value="">#</option>
                            {getClassNumberOptions(form.weeklySchedule[day].Subject, form.grade).map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            name={`weeklySchedule.${day}.classNumber`}
                            value={form.weeklySchedule?.[day]?.classNumber || ''}
                            onChange={handleScheduleChange}
                            className="p-1 border rounded w-16"
                            placeholder="#"
                          />
                        )
                      ) : (
                        <input
                          type="number"
                          min="1"
                          name={`weeklySchedule.${day}.classNumber`}
                          value={form.weeklySchedule?.[day]?.classNumber || ''}
                          onChange={handleScheduleChange}
                          className="p-1 border rounded w-16"
                          placeholder="#"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ margin: '8px 0' }}>
              <button
                type="button"
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the entire weekly schedule?')) {
                    setForm(prev => ({
                      ...prev,
                      weeklySchedule: { ...defaultSchedule }
                    }));
                  }
                }}
              >
                Clear Schedule
              </button>
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
            {students.map((student) => (
              <div key={student.id} className="bg-white p-4 rounded shadow flex flex-col gap-2 border max-w-xl">
                {editingId === student.id ? (
                  <form onSubmit={handleUpdateStudent} className="flex flex-col gap-2">
                    <input name="name" placeholder="Name" value={form.name || ""} onChange={handleFormChange} className="p-2 border rounded" required />
                    <input name="grade" placeholder="Grade" value={form.grade || ""} onChange={handleFormChange} className="p-2 border rounded" required />
                    <input name="email" type="email" placeholder="Email" value={form.email || ""} onChange={handleFormChange} className="p-2 border rounded" required />
                    <input name="phone" placeholder="Phone" value={form.phone || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="subjects" placeholder="Subjects (comma separated)" value={form.subjects || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="country" placeholder="Country" value={form.country || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="assignedTeacher" placeholder="Assigned Teacher" value={form.assignedTeacher || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <div className="font-semibold mt-2 mb-1">Weekly Schedule</div>
                    <table className="w-full border mb-2">
                      <thead>
                        <tr>
                          <th className="p-1 border">Day</th>
                          <th className="p-1 border">Date</th>
                          <th className="p-1 border">Subject</th>
                          <th className="p-1 border">Time</th>
                          <th className="p-1 border">Teacher</th>
                          <th className="p-1 border">Zoom Link</th>
                          <th className="p-1 border">Topic</th>
                          <th className="p-1 border">Class #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(day => (
                          <tr key={day}>
                            <td className="p-1 border font-semibold">{day}</td>
                            <td className="p-1 border">
                              <input
                                type="date"
                                name={`weeklySchedule.${day}.date`}
                                value={form.weeklySchedule?.[day]?.date || ''}
                                onChange={handleScheduleChange}
                                className="p-1 border rounded w-32"
                              />
                            </td>
                            <td className="p-1 border">
                              {form.subjects && form.subjects.split(',').map(s => s.trim()).filter(Boolean).length > 0 ? (
                                <select
                                  name={`weeklySchedule.${day}.Subject`}
                                  value={form.weeklySchedule?.[day]?.Subject || ''}
                                  onChange={handleScheduleChange}
                                  className="p-1 border rounded w-24"
                                >
                                  <option value="">Select</option>
                                  {form.subjects.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              ) : (
                                <input name={`weeklySchedule.${day}.Subject`} placeholder="Subject" value={form.weeklySchedule?.[day]?.Subject || ''} onChange={handleScheduleChange} className="p-1 border rounded w-24" />
                              )}
                            </td>
                            <td className="p-1 border">
                              {timeSlots.includes(form.weeklySchedule?.[day]?.Time || '') || !form.weeklySchedule?.[day]?.Time ? (
                                <select
                                  name={`weeklySchedule.${day}.Time`}
                                  value={form.weeklySchedule?.[day]?.Time || ''}
                                  onChange={handleScheduleChange}
                                  className="p-1 border rounded w-20"
                                >
                                  <option value="">Select</option>
                                  {timeSlots.map((t: string) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              ) : (
                                <input name={`weeklySchedule.${day}.Time`} placeholder="Time" value={form.weeklySchedule?.[day]?.Time || ''} onChange={handleScheduleChange} className="p-1 border rounded w-20" />
                              )}
                            </td>
                            <td className="p-1 border">
                              {teacherOptions.length > 0 ? (
                                <select
                                  name={`weeklySchedule.${day}.teacher`}
                                  value={form.weeklySchedule?.[day]?.teacher || ''}
                                  onChange={handleScheduleChange}
                                  className="p-1 border rounded w-24"
                                >
                                  <option value="">Select</option>
                                  {teacherOptions.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              ) : (
                                <input name={`weeklySchedule.${day}.teacher`} placeholder="Teacher" value={form.weeklySchedule?.[day]?.teacher || ''} onChange={handleScheduleChange} className="p-1 border rounded w-24" />
                              )}
                            </td>
                            <td className="p-1 border">
                              <input name={`weeklySchedule.${day}.zoomLink`} placeholder="Zoom Link" value={form.weeklySchedule?.[day]?.zoomLink || ''} onChange={handleScheduleChange} className="p-1 border rounded w-40" />
                            </td>
                            <td className="p-1 border">
                              <input name={`weeklySchedule.${day}.topic`} placeholder="Topic" value={form.weeklySchedule?.[day]?.topic || ''} onChange={handleScheduleChange} className="p-1 border rounded w-40" />
                            </td>
                            <td className="p-1 border">
                              {form.weeklySchedule?.[day]?.Subject && form.grade ? (
                                getClassNumberOptions(form.weeklySchedule[day].Subject, form.grade).length > 0 ? (
                                  <select
                                    name={`weeklySchedule.${day}.classNumber`}
                                    value={form.weeklySchedule?.[day]?.classNumber || ''}
                                    onChange={handleScheduleChange}
                                    className="p-1 border rounded w-16"
                                  >
                                    <option value="">#</option>
                                    {getClassNumberOptions(form.weeklySchedule[day].Subject, form.grade).map(num => (
                                      <option key={num} value={num}>{num}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="number"
                                    min="1"
                                    name={`weeklySchedule.${day}.classNumber`}
                                    value={form.weeklySchedule?.[day]?.classNumber || ''}
                                    onChange={handleScheduleChange}
                                    className="p-1 border rounded w-16"
                                    placeholder="#"
                                  />
                                )
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  name={`weeklySchedule.${day}.classNumber`}
                                  value={form.weeklySchedule?.[day]?.classNumber || ''}
                                  onChange={handleScheduleChange}
                                  className="p-1 border rounded w-16"
                                  placeholder="#"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ margin: '8px 0' }}>
                      <button
                        type="button"
                        className="bg-red-500 text-white px-4 py-2 rounded"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to clear the entire weekly schedule?')) {
                            setForm(prev => ({
                              ...prev,
                              weeklySchedule: { ...defaultSchedule }
                            }));
                          }
                        }}
                      >
                        Clear Schedule
                      </button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Update</button>
                      <button type="button" onClick={() => { setEditingId(null); setForm({}); }} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="font-semibold text-lg">{student.name} <span className="text-sm text-gray-500">(Grade {student.grade})</span></div>
                    <div><span className="font-medium">Email:</span> {student.email}</div>
                    <div><span className="font-medium">Phone:</span> {student.phone}</div>
                    <div><span className="font-medium">Subjects:</span> {student.subjects}</div>
                    <div><span className="font-medium">Country:</span> {student.country}</div>
                    <div><span className="font-medium">Assigned Teacher:</span> {student.assignedTeacher}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleEdit(student)} className="bg-yellow-500 text-white px-4 py-2 rounded">Edit</button>
                      <button onClick={() => handleDeleteStudent(student.id)} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
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