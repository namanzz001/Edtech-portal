"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { auth } from '@/lib/firebase';
import Sidebar from "../../../components/OpsSidebar";

const GRADES = [1, 2, 3, 4, 5, 6]; // Example grades
const SUBJECTS = ["math", "coding", "english"];
const CODING_FIELDS = ["Scratch", "Python"];

interface CurriculumClass {
  id: string;
  classNumber: number;
  title: string;
  description: string;
  homeworkLink: string;
  notesLink: string;
  recordingLink: string;
}

export default function CurriculumEditor() {
  const router = useRouter();
  const [grade, setGrade] = useState<string>("1");
  const [subject, setSubject] = useState<string>("math");
  const [codingField, setCodingField] = useState<string>(CODING_FIELDS[0]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<CurriculumClass>>({});
  const [adding, setAdding] = useState(false);

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
    fetchClasses();
    // eslint-disable-next-line
  }, [grade, subject, codingField]);

  async function fetchClasses() {
    setLoading(true);
    setClasses([]);
    let path = "";
    if (subject === "coding") {
      path = `curriculum/${codingField.toLowerCase()}_${subject}/classes`;
    } else {
      path = `curriculum/grade${grade}_${subject}/classes`;
    }
    const snap = await getDocs(collection(db, path));
    const out: CurriculumClass[] = [];
    snap.forEach((doc) => {
      out.push({ id: doc.id, ...doc.data() } as CurriculumClass);
    });
    out.sort((a, b) => a.classNumber - b.classNumber);
    setClasses(out);
    setLoading(false);
  }

  function handleEdit(idx: number) {
    setEditIdx(idx);
    setForm(classes[idx]);
    setAdding(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(idx: number | null) {
    if (!form.classNumber || !form.title) return;
    let path = "";
    if (subject === "coding") {
      path = `curriculum/${codingField.toLowerCase()}_${subject}/classes/class${form.classNumber}`;
    } else {
      path = `curriculum/grade${grade}_${subject}/classes/class${form.classNumber}`;
    }
    await setDoc(doc(db, path), {
      classNumber: Number(form.classNumber),
      title: form.title,
      description: form.description || "",
      homeworkLink: form.homeworkLink || "",
      notesLink: form.notesLink || "",
      recordingLink: form.recordingLink || "",
    });
    setEditIdx(null);
    setAdding(false);
    setForm({});
    fetchClasses();
  }

  async function handleDelete(id: string, classNumber: number) {
    let path = "";
    if (subject === "coding") {
      path = `curriculum/${codingField.toLowerCase()}_${subject}/classes/class${classNumber}`;
    } else {
      path = `curriculum/grade${grade}_${subject}/classes/class${classNumber}`;
    }
    await deleteDoc(doc(db, path));
    fetchClasses();
  }

  function handleAdd() {
    setAdding(true);
    setEditIdx(null);
    setForm({ classNumber: classes.length + 1, title: "", description: "", homeworkLink: "", notesLink: "", recordingLink: "" });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 text-black">
        <h1 className="text-2xl font-bold mb-6">📚 Curriculum Editor</h1>
        <div className="flex gap-4 mb-6">
          {subject === "coding" ? (
            <select value={codingField} onChange={e => setCodingField(e.target.value)} className="p-2 rounded border">
              {CODING_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          ) : (
            <select value={grade} onChange={e => setGrade(e.target.value)} className="p-2 rounded border">
              {GRADES.map(g => <option key={g} value={g}>{`Grade ${g}`}</option>)}
            </select>
          )}
          <select value={subject} onChange={e => setSubject(e.target.value)} className="p-2 rounded border">
            {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button onClick={handleAdd} className="ml-auto bg-blue-600 text-white px-4 py-2 rounded">+ Add Class</button>
        </div>
        {loading ? <p>Loading...</p> : (
          <div className="space-y-4">
            {adding && (
              <div className="bg-white p-4 rounded shadow flex flex-col gap-2 border">
                <input name="classNumber" type="number" placeholder="Class Number" value={form.classNumber || ""} onChange={handleFormChange} className="p-2 border rounded" />
                <input name="title" placeholder="Title" value={form.title || ""} onChange={handleFormChange} className="p-2 border rounded" />
                <textarea name="description" placeholder="Description" value={form.description || ""} onChange={handleFormChange} className="p-2 border rounded" />
                <input name="homeworkLink" placeholder="Homework Link" value={form.homeworkLink || ""} onChange={handleFormChange} className="p-2 border rounded" />
                <input name="notesLink" placeholder="Notes Link" value={form.notesLink || ""} onChange={handleFormChange} className="p-2 border rounded" />
                <input name="recordingLink" placeholder="Recording Link" value={form.recordingLink || ""} onChange={handleFormChange} className="p-2 border rounded" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleSave(null)} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
                  <button onClick={() => { setAdding(false); setForm({}); }} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                </div>
              </div>
            )}
            {classes.map((cls, idx) => (
              <div key={cls.id} className="bg-white p-4 rounded shadow flex flex-col gap-2 border">
                {editIdx === idx ? (
                  <>
                    <input name="classNumber" type="number" placeholder="Class Number" value={form.classNumber || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="title" placeholder="Title" value={form.title || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <textarea name="description" placeholder="Description" value={form.description || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="homeworkLink" placeholder="Homework Link" value={form.homeworkLink || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="notesLink" placeholder="Notes Link" value={form.notesLink || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <input name="recordingLink" placeholder="Recording Link" value={form.recordingLink || ""} onChange={handleFormChange} className="p-2 border rounded" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleSave(idx)} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
                      <button onClick={() => { setEditIdx(null); setForm({}); }} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-lg">Class {cls.classNumber}: {cls.title}</div>
                    <div className="text-gray-600">{cls.description}</div>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <a href={cls.homeworkLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Homework</a>
                      <a href={cls.notesLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Notes</a>
                      <a href={cls.recordingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Recording</a>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleEdit(idx)} className="bg-yellow-500 text-white px-4 py-2 rounded">Edit</button>
                      <button onClick={() => handleDelete(cls.id, cls.classNumber)} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
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