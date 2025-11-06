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

async function findMissingConversation() {
  try {
    console.log('Looking for conversation 0a66024b-bfbf-4808-8e13-61eabaa5c9ac...');
    
    // Find the specific conversation that was mentioned in the previous session
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        projects!inner(name, id, userid)
      `)
      .eq('id', '0a66024b-bfbf-4808-8e13-61eabaa5c9ac')
      .single();

    if (convError) {
      console.error('Error finding conversation:', convError);
      
      // Check if conversation was deleted
      console.log('\nChecking if this conversation exists at all...');
      const { data: anyConv, error: anyError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', '0a66024b-bfbf-4808-8e13-61eabaa5c9ac');
        
      if (anyError || !anyConv || anyConv.length === 0) {
        console.log('❌ Conversation 0a66024b-bfbf-4808-8e13-61eabaa5c9ac does NOT exist in database');
        console.log('This conversation was likely deleted during the cleanup process.');
      }
      return;
    }

    console.log('✅ Found conversation:', conversation);
    console.log(`Project: ${conversation.projects.name} (${conversation.projects.id})`);
    console.log(`Project belongs to user: ${conversation.projects.userid}`);
    
    // Get messages for this conversation
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversationid', conversation.id)
      .order('createdat', { ascending: true });

    if (msgError) {
      console.error('Error getting messages:', msgError);
      return;
    }

    console.log(`\nFound ${messages.length} messages in this conversation:`);
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.role}: ${msg.content.substring(0, 100)}...`);
    });
    
    // Check if this is associated with the expected Project4 ID
    const expectedProject4Id = 'b82b1b32-6a8c-413a-9b12-ba1e31d5e4a5';
    if (conversation.projectid !== expectedProject4Id) {
      console.log(`\n⚠️  ISSUE: This conversation belongs to project ${conversation.projectid}, not ${expectedProject4Id}`);
      console.log('The conversation with messages is associated with a different project.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findMissingConversation();