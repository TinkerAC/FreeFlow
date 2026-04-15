export interface ProfileSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileIndex {
  activeProfileId: string;
  profiles: ProfileSummary[];
}

export interface SwitchProfileResult {
  activeProfileId: string;
  relaunchRequired: boolean;
}

