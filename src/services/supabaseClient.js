import { createClient } from '@supabase/supabase-js';

// Idéalement, mettez ceci dans un fichier .env (VITE_SUPABASE_URL, etc.)
const supabaseUrl = 'https://vmlozrwjjatqcjvdqkxu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbG96cndqamF0cWNqdmRxa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjA0OTAsImV4cCI6MjA4MDgzNjQ5MH0.KkPEbDAbtDIMGjPTTMqAARhJ4LYUYVdsrhFhA6V4Iqg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);