// src/lib/avatars.ts
//
// The avatar set offered at onboarding.
//
// A constant rather than a directory read: the files are checked into
// public/assets/avatars/, so listing them with `fs` at request time buys
// nothing and only adds a filesystem dependency to a page that is otherwise
// static. Adding an avatar means adding a line here and a file there.

export const AVATAR_FILES = [
  "profile-pic-1.png",
  "profile-pic-2.png",
  "profile-pic-3.png",
  "profile-pic-4.png",
  "profile-pic-5.png",
  "profile-pic-6.png",
  "profile-pic-7.png",
  "profile-pic-8.png",
] as const;

/** The value stored in `profiles.avatar_url`. */
export const avatarPath = (file: string) => `/assets/avatars/${file}`;

export const AVATAR_PATHS = AVATAR_FILES.map(avatarPath);
