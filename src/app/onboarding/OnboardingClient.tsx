"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { BackgroundPattern } from '@/components/BackgroundPattern';

interface OnboardingClientProps {
  avatars: string[];
}

export default function OnboardingClient({ avatars }: OnboardingClientProps) {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isValidUsername = username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
  const canSubmit = isValidUsername && selectedAvatar !== null;

  useEffect(() => {
    // If not logged in, they shouldn't be here
    if (!user && !loading) {
      // Small timeout to allow auth state to settle
      const timeout = setTimeout(() => {
        if (!user) router.replace('/login');
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Check if username is taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError; // Ignore "not found" error
      
      if (existingUser) {
        setError("That username is already taken. Try another one.");
        setLoading(false);
        return;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username,
          full_name: username, // Sync full_name as well for backwards compatibility if needed
          avatar_url: `/assets/avatars/${selectedAvatar}`
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh local auth context profile
      if (refreshProfile) {
        await refreshProfile();
      }

      // Redirect to main app
      router.push('/learn');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save profile. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <BackgroundPattern />
      
      <div className="w-full max-w-md lg:max-w-2xl bg-surface rounded-2xl shadow-sm p-8 space-y-8 animate-fade-up border border-slate-100">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-text-heading tracking-tight">Set up your profile</h1>
          <p className="text-sm text-text-body">Pick a username and an avatar to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-heading block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. changemaker_99"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl text-base focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all"
            />
            {username.length > 0 && !isValidUsername && (
              <p className="text-xs text-warning">
                Must be 3-20 characters, letters, numbers, and underscores only.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-text-heading block">Choose an Avatar</label>
            
            {avatars.length === 0 ? (
              <div className="p-4 bg-warning-bg text-warning rounded-xl text-sm text-center">
                No avatars found in the assets folder. Proceed with default.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
                {avatars.map((filename) => (
                  <button
                    key={filename}
                    type="button"
                    onClick={() => setSelectedAvatar(filename)}
                    className={`relative aspect-square rounded-2xl border-2 transition-all overflow-hidden active:scale-95 md:hover:shadow-md ${
                      selectedAvatar === filename 
                        ? 'border-primary shadow-md scale-105' 
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50'
                    }`}
                  >
                    <Image
                      src={`/assets/avatars/${filename}`}
                      alt={filename}
                      fill
                      className="object-contain p-2"
                    />
                    {selectedAvatar === filename && (
                      <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-warning-bg border border-warning/20 rounded-xl text-sm text-warning font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-full text-sm transition-all shadow-sm flex items-center justify-center gap-2 btn-bouncy"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
