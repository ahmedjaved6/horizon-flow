import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zcpahkiucdheltruyhwg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcGFoa2l1Y2RoZWx0cnV5aHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMDYwMzIsImV4cCI6MjA4Mzg4MjAzMn0.oA2uymVmt-Gj-MRv93WMv3MOcc5MYuim4fmaq7tz-Kg";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);