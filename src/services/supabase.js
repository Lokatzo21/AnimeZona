import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmlobzzlszwprjtrkicv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbG9ienpsc3p3cHJqdHJraWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0OTQ3MjksImV4cCI6MjEwMjA3MDcyOX0.vqxcGLSrSGxlbP7yGwnQvdDT52wgbxyH56mTGi8eNEM';
export const supabase = createClient(supabaseUrl, supabaseKey);
