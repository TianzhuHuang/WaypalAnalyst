import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 获取用户资料
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile[0]);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}

// 更新用户资料
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, bedPreference, budgetLevel, dietaryRestrictions } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (fullName !== undefined) updateData.fullName = fullName;
    if (bedPreference !== undefined) updateData.bedPreference = bedPreference;
    if (budgetLevel !== undefined) updateData.budgetLevel = budgetLevel;
    if (dietaryRestrictions !== undefined) updateData.dietaryRestrictions = dietaryRestrictions;

    const [updated] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, session.user.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}
