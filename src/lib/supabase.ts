import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://khowtwokxzoberzqdtql.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Qzwy0Zpw2Q7o8Mur4UhptQ_IP8T2Gh3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
