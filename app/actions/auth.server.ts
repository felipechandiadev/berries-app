'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

export interface CurrentUserSession {
  userId?: string;
  userName?: string;
  userEmail?: string;
  role?: string;
}

export async function getCurrentUserSession(): Promise<CurrentUserSession> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as Record<string, any> | undefined;

    return {
      userId: user?.id,
      userName: typeof user?.name === 'string' ? user.name : undefined,
      userEmail: typeof user?.email === 'string' ? user.email : undefined,
      role: typeof user?.role === 'string' ? user.role : undefined,
    };
  } catch (error) {
    console.error('[getCurrentUserSession] Error obtaining session:', error);
    return {
      userId: undefined,
      userName: undefined,
      userEmail: undefined,
      role: undefined,
    };
  }
}
