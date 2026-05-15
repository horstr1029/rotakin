import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { updateUser, deleteUser, resetPassword, findUserById, listUsers } from '@/lib/auth-db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'admin') return { session: null, error: 'Forbidden', status: 403 } as const;
  return { session, error: null } as const;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status as number });

  const { id } = await ctx.params;
  const body = await req.json() as { name?: string; email?: string; role?: 'admin' | 'user'; isActive?: boolean; newPassword?: string };

  if (body.isActive === false) {
    const admins = listUsers().filter(u => u.role === 'admin' && u.isActive);
    if (admins.length === 1 && admins[0].id === id) {
      return NextResponse.json({ error: 'Cannot deactivate the last admin account' }, { status: 409 });
    }
  }

  if (body.newPassword !== undefined) {
    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const ok = resetPassword(id, body.newPassword);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (body.email !== undefined) {
    const existing = (await import('@/lib/auth-db')).findUserByEmail(body.email);
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
  }
  const updated = updateUser(id, { name: body.name, email: body.email, role: body.role, isActive: body.isActive });
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'User not found' }, { status: 404 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status as number });

  const { id } = await ctx.params;

  if (auth.session!.user.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 409 });
  }

  const target = findUserById(id);
  if (target?.role === 'admin') {
    const admins = listUsers().filter(u => u.role === 'admin');
    if (admins.length === 1) {
      return NextResponse.json({ error: 'Cannot delete the last admin account' }, { status: 409 });
    }
  }

  const ok = deleteUser(id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'User not found' }, { status: 404 });
}
