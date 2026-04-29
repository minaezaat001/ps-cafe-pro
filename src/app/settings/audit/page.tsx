import AuditClient from './AuditClient';
import { getAuditLogs } from '@/app/actions/settings.actions';
import { requireAuthUser } from '@/lib/action-guards';

export default async function AuditPage() {
  const user = await requireAuthUser();
  
  // Check permissions
  if (user.role !== 'ADMIN' && !user.permissions?.includes('settings.manage')) {
    return (
      <div className="max-w-5xl mx-auto py-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Audit <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Logs</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track all sensitive actions with justifications
            </p>
          </div>
        </div>
      </div>

      <AuditClient />
    </div>
  );
}
