'use client';
import { useEffect } from 'react';
import { Plus, Folder, Trash2, Shield, FileText, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Props {
  onOpen: (id: string) => void;
  onNew: () => void;
}

export default function AuditManager({ onOpen, onNew }: Props) {
  const { auditList, loadAuditList, openAuditById, deleteAuditFromList, newAudit } = useStore();
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    loadAuditList();
  }, [loadAuditList]);

  async function handleNew() {
    newAudit();
    await loadAuditList();
    onNew();
  }

  async function handleOpen(id: string) {
    await openAuditById(id);
    onOpen(id);
  }

  async function handleDelete(id: string, siteName: string) {
    const confirmed = window.confirm(
      `Delete audit "${siteName || '(untitled)'}"? This cannot be undone.`
    );
    if (!confirmed) return;
    await deleteAuditFromList(id);
    toast.success('Audit deleted');
  }

  const sorted = [...auditList].sort((a, b) =>
    (b.lastModified || '').localeCompare(a.lastModified || '')
  );

  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--rk-bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center mb-10">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(0,194,255,0.12)', border: '1px solid rgba(0,194,255,0.25)' }}
          >
            <Shield className="w-8 h-8" style={{ color: 'var(--rk-accent)' }} />
          </div>
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: 'var(--rk-accent)' }}
          >
            ROTAKIN
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--rk-text2)' }}>
            v3 — CCTV Audit Manager
          </p>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-base font-semibold uppercase tracking-wider"
            style={{ color: 'var(--rk-text2)' }}
          >
            Recent Audits
          </h2>
          <div className="flex items-center gap-2">
            {session?.user.role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => router.push('/admin')} className="gap-1.5 text-xs">
                <Settings className="w-3.5 h-3.5" /> Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })} className="gap-1.5 text-xs">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Button>
            <Button onClick={handleNew} className="gap-1.5" style={{ background: 'var(--rk-accent)', color: '#000' }}>
              <Plus className="w-4 h-4" /> New Audit
            </Button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Folder className="w-12 h-12 mb-4" style={{ color: 'var(--rk-text3)' }} />
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--rk-text)' }}>
                No audits yet
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--rk-text2)' }}>
                Start your first compliance audit to get going.
              </p>
              <Button onClick={handleNew} className="gap-1.5" style={{ background: 'var(--rk-accent)', color: '#000' }}>
                <Plus className="w-4 h-4" /> Create First Audit
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map(a => (
              <Card key={a.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                      style={{
                        background: 'rgba(0,194,255,0.08)',
                        border: '1px solid rgba(0,194,255,0.18)',
                      }}
                    >
                      <FileText className="w-5 h-5" style={{ color: 'var(--rk-accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-base font-semibold truncate"
                        style={{ color: 'var(--rk-text)' }}
                      >
                        {a.siteName || '(Untitled audit)'}
                      </p>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--rk-text2)' }}
                      >
                        {[a.client || '—', a.auditDate || '—', `${a.cameraCount} camera${a.cameraCount !== 1 ? 's' : ''}`].join(' · ')}
                      </p>
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: 'var(--rk-text3)' }}
                      >
                        Last modified: {a.lastModified ? new Date(a.lastModified).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleOpen(a.id)}
                        style={{ background: 'var(--rk-accent)', color: '#000' }}
                      >
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleDelete(a.id, a.siteName)}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--rk-red)' }} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
