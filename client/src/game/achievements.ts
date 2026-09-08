import { API, authHeaders } from './identity';

export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly earned: boolean;
  readonly awardedAt: string | null;
  readonly threshold: number | null;
  readonly progress: number | null;
}

export interface AchievementState {
  readonly achievements: readonly Achievement[];
}

export async function loadAchievements(): Promise<AchievementState | null> {
  try {
    const response = await fetch(`${API}/api/v1/achievements`, { headers: authHeaders() });
    return response.ok ? ((await response.json()) as AchievementState) : null;
  } catch {
    return null;
  }
}
