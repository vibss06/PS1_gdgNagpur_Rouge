import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hxngzfttjeqfttxclwcw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4bmd6ZnR0amVxZnR0eGNsd2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTU0MjMsImV4cCI6MjA5MTIzMTQyM30.wYlyAtOGplVQJw6RDVG1uJ7yfzoaeQAQ9t0hOZPADOc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
