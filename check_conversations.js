import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkConversations() {
  try {
    console.log('Checking conversations for Project4...');
    
    // Get conversations for Project4
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', 'b82b1b32-6a8c-413a-9b12-ba1e31d5e4a5')
      .order('updatedat', { ascending: false });

    if (convError) {
      console.error('Error getting conversations:', convError);
      return;
    }

    console.log(`Found ${conversations.length} conversations for Project4:`);
    conversations.forEach(conv => {
      console.log(`- ID: ${conv.id}, Title: ${conv.title}, Created: ${conv.createdat}, Updated: ${conv.updatedat}`);
    });

    if (conversations.length > 0) {
      // Get messages for each conversation
      for (const conv of conversations) {
        console.log(`\nChecking messages for conversation ${conv.id}:`);
        
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversationid', conv.id)
          .order('createdat', { ascending: true });

        if (msgError) {
          console.error(`Error getting messages for conversation ${conv.id}:`, msgError);
          continue;
        }

        console.log(`  Found ${messages.length} messages`);
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.role}: ${msg.content.substring(0, 100)}... (Created: ${msg.createdat})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkConversations();