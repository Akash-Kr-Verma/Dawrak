// src/hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

export const DEMO_PROFILE: Profile = {
  id: 'demo-user-id',
  username: 'demo_user',
  full_name: 'Demo Changemaker',
  avatar_url: null,
  total_points: 0,
  level: 1,
  created_at: new Date().toISOString(),
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Fallback for hackathon demo if no session exists
        setProfile(DEMO_PROFILE);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !data) {
        console.warn('Error fetching profile or not found, using fallback:', error);
        setProfile(DEMO_PROFILE);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(DEMO_PROFILE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, refreshProfile: fetchProfile };
}
