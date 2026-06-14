import { createClient } from '@supabase/supabase-js';

export interface BetaReaderProfile {
  user_id: string;
  name: string | null;
  contact_info: string | null;
  seed: string;
  reading_mode: 'traveler' | 'partner';
  traveler_progress: string[];
  partner_progress: number;
  created_at?: string;
}

export interface BetaReadingLog {
  id?: number | string;
  user_id: string;
  fragment_id: string;
  action: 'view' | 'advance';
  reaction: string | null;
  comments: string | null;
  created_at: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local Storage Fallback Keys
const LOCAL_READERS_KEY = 'chronotypical_beta_readers';
const LOCAL_LOGS_KEY = 'chronotypical_beta_reading_logs';

// Helper to pre-populate mock data in Demo Mode
const initMockData = () => {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(LOCAL_READERS_KEY);
  if (!existing) {
    const mockReaders: Record<string, BetaReaderProfile> = {
      'demo-traveler': {
        user_id: 'demo-traveler',
        name: null,
        contact_info: null,
        seed: 'BETA-TRAVEL-SEED',
        reading_mode: 'traveler',
        traveler_progress: [],
        partner_progress: -1,
        created_at: new Date().toISOString(),
      },
      'demo-partner': {
        user_id: 'demo-partner',
        name: null,
        contact_info: null,
        seed: 'BETA-PARTNER-SEED',
        reading_mode: 'partner',
        traveler_progress: [],
        partner_progress: -1,
        created_at: new Date().toISOString(),
      },
    };
    localStorage.setItem(LOCAL_READERS_KEY, JSON.stringify(mockReaders));
  }
};

// Initialize right away if in client browser
if (!isSupabaseConfigured) {
  initMockData();
}

/**
 * Fetch a beta reader profile by ID.
 */
export async function getBetaReader(userId: string): Promise<BetaReaderProfile | null> {
  const cleanId = userId.trim().toLowerCase();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('beta_readers')
      .select('*')
      .eq('user_id', cleanId);

    if (error) {
      console.warn(`Supabase getBetaReader error:`, error.message);
      return null;
    }
    if (!data || data.length === 0) {
      return null;
    }
    return data[0] as BetaReaderProfile;
  } else {
    // Local storage mock
    const readers = JSON.parse(localStorage.getItem(LOCAL_READERS_KEY) || '{}');
    return readers[cleanId] || null;
  }
}

/**
 * Create or update a beta reader profile (used for onboarding or updating progress).
 */
export async function createOrUpdateBetaReader(
  profile: Partial<BetaReaderProfile> & { user_id: string }
): Promise<BetaReaderProfile | null> {
  const cleanId = profile.user_id.trim().toLowerCase();
  const normalizedProfile = {
    ...profile,
    user_id: cleanId,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('beta_readers')
      .upsert(normalizedProfile)
      .select()
      .single();

    if (error) {
      console.error(`Supabase createOrUpdateBetaReader error:`, error.message);
      throw error;
    }
    return data as BetaReaderProfile;
  } else {
    // Local storage mock
    const readers = JSON.parse(localStorage.getItem(LOCAL_READERS_KEY) || '{}');
    const existing = readers[cleanId] || {
      user_id: cleanId,
      name: null,
      contact_info: null,
      seed: Math.random().toString(36).substring(2, 8).toUpperCase(),
      reading_mode: 'traveler',
      traveler_progress: [],
      partner_progress: -1,
      created_at: new Date().toISOString(),
    };

    const updated: BetaReaderProfile = {
      ...existing,
      ...normalizedProfile,
    };

    readers[cleanId] = updated;
    localStorage.setItem(LOCAL_READERS_KEY, JSON.stringify(readers));
    return updated;
  }
}

/**
 * Log a beta reader action (view or advance) with exact timestamp (including seconds).
 */
export async function logBetaReadingEvent(
  event: Omit<BetaReadingLog, 'created_at'>
): Promise<void> {
  const cleanId = event.user_id.trim().toLowerCase();
  const normalizedEvent = {
    ...event,
    user_id: cleanId,
  };
  const timestampWithSeconds = new Date().toISOString();
  
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('beta_reading_logs')
      .insert({
        ...normalizedEvent,
        created_at: timestampWithSeconds,
      });

    if (error) {
      console.error(`Supabase logBetaReadingEvent error:`, error.message);
    }
  } else {
    // Local storage mock
    const logs: BetaReadingLog[] = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    const newLog: BetaReadingLog = {
      id: Math.random().toString(36).substring(2, 10),
      ...normalizedEvent,
      created_at: timestampWithSeconds,
    };
    logs.push(newLog);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  }
}
