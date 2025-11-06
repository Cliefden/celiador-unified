// Database utility functions
import { createClient } from '@supabase/supabase-js';

let supabase: any = null;
let supabaseService: any = null;

// Initialize Supabase clients
export function initializeSupabase() {
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
      );
      supabaseService = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log('✅ Supabase clients initialized');
      return { supabase, supabaseService };
    } else {
      console.log('⚠️ Supabase credentials not found, running in limited mode');
      return { supabase: null, supabaseService: null };
    }
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return { supabase: null, supabaseService: null };
  }
}

// Get Supabase clients
export function getSupabaseClients() {
  return { supabase, supabaseService };
}

// Database operations interface
export const db = {
  async getProjectById(projectId: string) {
    if (!supabaseService) return null;
    
    const { data, error } = await supabaseService
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }
    
    return data;
  },

  async createConversation(conversationData: any) {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data, error } = await supabaseService
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getConversationsByProject(projectId: string, userId: string) {
    if (!supabaseService) return [];
    
    const { data, error } = await supabaseService
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .order('createdat', { ascending: false });
    
    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
    
    return data || [];
  }
};