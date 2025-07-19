'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-6 flex flex-col min-h-screen">
        <h2 className="text-xl font-bold mb-8">🛡️ Admin Panel</h2>
        <ul className="space-y-4 flex-1">
          <li><Link href="/admin/dashboard" className="hover:underline">Dashboard</Link></li>
          <li><Link href="/admin/users" className="hover:underline">Users</Link></li>
          <li><Link href="/admin/logs" className="hover:underline">Activity Logs</Link></li>
          <li><Link href="/admin/issues" className="hover:underline">Issues</Link></li>
          <li><Link href="/admin/system" className="hover:underline">System Health</Link></li>
          <li><Link href="/admin/curriculum" className="hover:underline">Curriculum</Link></li>
          <li><Link href="/admin/roles" className="hover:underline">Roles</Link></li>
          <li><Link href="/admin/announcements" className="hover:underline">Announcements</Link></li>
          <li><Link href="/admin/reports" className="hover:underline">Reports</Link></li>
        </ul>
        <div className="mt-8">
          <button className="w-full py-2 bg-red-600 rounded text-white hover:bg-red-700" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-10 bg-gray-100 text-black">
        {children}
      </div>
    </div>
  );
} 