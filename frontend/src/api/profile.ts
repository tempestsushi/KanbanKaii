import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';

export interface ProfileValues {
  displayName: string;
  jobTitle: string;
}

export async function updateProfile(
  user: User,
  values: ProfileValues,
): Promise<User> {
  const { data, error } = await getSupabaseClient().auth.updateUser({
    data: {
      ...user.user_metadata,
      display_name: values.displayName,
      job_title: values.jobTitle,
    },
  });

  if (error) throw error;
  return data.user;
}
