import { redirect } from 'next/navigation';

export default function AdminLoginRedirect() {
  redirect('/admin-login');
  return null;
} 