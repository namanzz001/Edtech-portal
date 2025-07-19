import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function OpsSidebar() {
  const router = useRouter();
  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/ops/login');
  };
  return (
    <div className="w-64 bg-gray-900 text-white p-6 min-h-screen">
      <h2 className="text-xl font-bold mb-6">🛠️ Ops Panel</h2>
      <ul className="space-y-4">
        <li><Link href="/ops/dashboard" className="hover:underline">📅 Today’s Classes</Link></li>
        <li><Link href="/ops/curriculum-editor" className="hover:underline">📚 Curriculum Editor</Link></li>
        <li><Link href="/ops/students" className="hover:underline">👨‍🎓 Students</Link></li>
        <li><Link href="/ops/teachers" className="hover:underline">👩‍🏫 Teachers</Link></li>
        <li><button onClick={handleLogout} className="hover:underline text-left w-full">🚪 Logout</button></li>
      </ul>
    </div>
  );
}
