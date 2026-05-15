'use client';
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, KeyRound, Shield, User, ChevronLeft, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import type { SafeUser, UserRole } from '@/lib/auth-db';

interface CreateForm { name: string; email: string; password: string; role: UserRole; }
interface EditForm { name: string; email: string; role: UserRole; }

export default function AdminPanel({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<SafeUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SafeUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '', email: '', password: '', role: 'user' });
  const [editTarget, setEditTarget] = useState<SafeUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', role: 'user' });
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error();
      setUsers(await res.json() as SafeUser[]);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? 'Failed to create user'); return; }
      toast.success(`User ${createForm.email} created`);
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', role: 'user' });
      loadUsers();
    } finally { setSubmitting(false); }
  }

  function openEdit(user: SafeUser) {
    setEditTarget(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, email: editForm.email, role: editForm.role }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? 'Failed to update user'); return; }
      toast.success('User updated');
      setEditTarget(null);
      loadUsers();
    } finally { setSubmitting(false); }
  }

  async function handleToggleActive(user: SafeUser) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) { toast.error(data.error ?? 'Failed to update'); return; }
    toast.success(user.isActive ? 'User deactivated' : 'User activated');
    loadUsers();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return; }
      toast.success('Password reset');
      setResetTarget(null);
      setNewPassword('');
    } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return; }
      toast.success('User deleted');
      setDeleteTarget(null);
      loadUsers();
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--rk-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b" style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)' }}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-1.5 text-xs">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Button>
        <Shield className="w-4 h-4" style={{ color: 'var(--rk-accent)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--rk-text)' }}>User Management</span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs">
          <UserPlus className="w-3.5 h-3.5" /> Add User
        </Button>
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--rk-border)', background: 'var(--rk-surface)' }}>
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--rk-text3)' }}>Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium" style={{ color: 'var(--rk-text)' }}>
                      {user.name}
                      {user.id === currentUserId && <span className="ml-2 text-xs" style={{ color: 'var(--rk-text3)' }}>(you)</span>}
                    </TableCell>
                    <TableCell style={{ color: 'var(--rk-text2)' }}>{user.email}</TableCell>
                    <TableCell>
                      <Badge style={user.role === 'admin'
                        ? { color: 'var(--rk-accent)', background: 'rgba(0,194,255,0.1)', border: '1px solid rgba(0,194,255,0.2)' }
                        : { color: 'var(--rk-text2)', background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)' }}>
                        {user.role === 'admin' ? <><Shield className="w-3 h-3 mr-1 inline" />Admin</> : <><User className="w-3 h-3 mr-1 inline" />User</>}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge style={user.isActive
                        ? { color: 'var(--rk-green)', background: 'rgba(16,217,138,0.1)', border: '1px solid rgba(16,217,138,0.2)' }
                        : { color: 'var(--rk-red)', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs" style={{ color: 'var(--rk-text3)' }}>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit user"
                          onClick={() => openEdit(user)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Reset password"
                          onClick={() => { setResetTarget(user); setNewPassword(''); }}>
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2"
                          disabled={user.id === currentUserId}
                          onClick={() => handleToggleActive(user)}>
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          disabled={user.id === currentUserId}
                          onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--rk-red)' }} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update name, email address, or role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-name">Full Name</Label>
              <Input id="e-name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="e-email">Email</Label>
              <Input id="e-email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v: string | null) => { if (v === 'admin' || v === 'user') setEditForm(f => ({ ...f, role: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new account. The user can log in immediately with these credentials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-name">Full Name</Label>
              <Input id="c-name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-password">Initial Password</Label>
              <Input id="c-password" type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" required minLength={8} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(v: string | null) => { if (v === 'admin' || v === 'user') setCreateForm(f => ({ ...f, role: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) setResetTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for <strong>{resetTarget?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-password">New Password</Label>
              <Input id="r-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Resetting…' : 'Reset Password'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Deleting…' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
