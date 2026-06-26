import { useState, useEffect } from "react";
import { UserProfile, DEFAULT_STATS } from "../types/profile";

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  bio: "",
  photoUrl: "",
  xp: 0,
  level: 1,
  stats: DEFAULT_STATS,
  achievements: [],
  profileViews: 0,
  lastActive: new Date().toISOString(),
  eloRating: 0,
  eloTitle: "Sin clasificar",
  eloManual: false,
};

export function useProfile(isGuestMode: boolean = false) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("userProfile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PROFILE, ...parsed, stats: { ...DEFAULT_STATS, ...parsed.stats } };
      } catch (e) {
        console.error("Error parsing profile from localStorage", e);
      }
    }
    return DEFAULT_PROFILE;
  });

  useEffect(() => {
    if (!isGuestMode) localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile, isGuestMode]);

  return { profile, setProfile };
}
