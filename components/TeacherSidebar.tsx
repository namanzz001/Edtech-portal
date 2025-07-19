import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const navLinks = [
  { href: '/teacher/dashboard', label: 'Dashboard' },
  { href: '/teacher/students', label: 'Students' },
  { href: '/teacher/curriculum', label: 'Curriculum' },
  { href: '/teacher/free-slots', label: 'Free Slots' },
];

export default function TeacherSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const handleLogout = async () => {
    await auth.signOut();
    router.replace('/teacher/login');
  };
  return (
    <div className="w-64 bg-gray-800 text-white p-6 min-h-screen">
      <h2 className="text-xl font-bold mb-8">👩‍🏫 Teacher</h2>
      <ul className="space-y-4">
        {navLinks.map(link => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block px-2 py-1 rounded hover:underline ${pathname === link.href ? 'bg-gray-700 font-bold' : ''}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={handleLogout}
            className={
              `block px-2 py-1 rounded text-left w-full hover:underline hover:bg-gray-700 focus:bg-gray-700`}
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
} 