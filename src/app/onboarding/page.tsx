import React from 'react';
import fs from 'fs';
import path from 'path';
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const assetsDir = path.join(process.cwd(), 'public', 'assets', 'avatars');
  let avatars: string[] = [];

  try {
    const files = fs.readdirSync(assetsDir);
    // Filter for common image extensions
    avatars = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
    
  } catch (err) {
    console.error("Failed to read assets directory for avatars", err);
  }

  return (
    <OnboardingClient avatars={avatars} />
  );
}
