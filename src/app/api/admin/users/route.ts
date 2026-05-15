import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listUsers, createUser } from '@/lib/auth-db';
import type { UserRole } from '@/lib/auth-db';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: 'Unauthorized', status: 401 } as const;
  if (session.user.role !== 'admin') return { error: 'Forbidden', status: 403 } as const;
  return null;
}

export async function GET() {
  const err = await requireAdmin();
  if (err) return NextResponse.json({ error: err.error }, { status: err.status });
  return NextResponse.json(listUsers());
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin();
  if (err) return NextResponse.json({ error: err.error }, { status: err.status });

  const body = await req.json() as { email?: string; name?: string; password?: string; role?: string };
  const { email, name, password, role } = body;

  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const user = createUser(email, name, password, role as UserRole);
    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    console.error('[admin/users POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
