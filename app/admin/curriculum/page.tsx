'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CurriculumItem {
  id: string;
  title: string;
  description: string;
}

export default function AdminCurriculumPage() {
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCurriculum() {
      try {
        const ref = collection(db, 'curriculum');
        const snapshot = await getDocs(ref);
        const list: CurriculumItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || '(No title)',
            description: data.description || '',
          });
        });
        setCurriculum(list);
      } catch (err) {
        setCurriculum([]);
      }
      setLoading(false);
    }
    fetchCurriculum();
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Curriculum Management</h1>
      <p className="mb-4">View and edit all curriculum data.</p>
      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled>Add New Curriculum (Coming Soon)</button>
      {loading ? <p>Loading...</p> : (
        curriculum.length === 0 ? <p>No curriculum found.</p> : (
          <table className="min-w-full bg-white rounded shadow text-black">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Title</th>
                <th className="py-2 px-4 border-b">Description</th>
              </tr>
            </thead>
            <tbody>
              {curriculum.map(item => (
                <tr key={item.id}>
                  <td className="py-2 px-4 border-b">{item.title}</td>
                  <td className="py-2 px-4 border-b">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
} 