import { getCurrentUser } from '@/app/actions';
import SettingsLayoutClient from './SettingsLayoutClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return <SettingsLayoutClient currentUser={user}>{children}</SettingsLayoutClient>;
}
