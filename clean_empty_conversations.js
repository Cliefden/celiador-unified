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

async function cleanEmptyConversations() {
  const projectId = '913784dd-6719-4a00-924b-b6993779d414'; // Project4
  const userId = 'bed94e99-1ed1-4322-b05f-cdfdf2e9dbc0';   // User ID from logs
  
  console.log('🧹 Cleaning empty conversations for Project4...');
  
  try {
    // Get all conversations for Project4
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .eq('status', 'ACTIVE')
      .order('updatedat', { ascending: false });

    console.log(`\n✅ Found ${conversations.length} conversations`);

    // Check message counts and identify empty conversations
    const conversationsToDelete = [];
    const knownGoodConversation = '0a66024b-bfbf-4808-8e13-61eabaa5c9ac';
    
    for (const conv of conversations) {
      if (conv.id === knownGoodConversation) {
        console.log(`🎯 Keeping conversation with messages: ${conv.id}`);
        continue;
      }
      
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversationid', conv.id);
      
      const messageCount = messages?.length || 0;
      console.log(`   ${conv.id.substring(0, 8)}... - ${messageCount} messages`);
      
      if (messageCount === 0) {
        conversationsToDelete.push(conv.id);
        console.log(`   ❌ Marking for deletion (empty)`);
      } else {
        console.log(`   ✅ Keeping (has messages)`);
      }
    }

    if (conversationsToDelete.length > 0) {
      console.log(`\n🗑️  Deleting ${conversationsToDelete.length} empty conversations...`);
      
      for (const convId of conversationsToDelete) {
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', convId);
          
        if (error) {
          console.error(`❌ Failed to delete ${convId}:`, error);
        } else {
          console.log(`✅ Deleted ${convId}`);
        }
      }
    } else {
      console.log('\n✅ No empty conversations to delete');
    }

    // Verify the final state
    console.log('\n🔍 Final state:');
    const { data: finalConversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .eq('status', 'ACTIVE');

    console.log(`✅ Project4 now has ${finalConversations.length} conversation(s)`);
    finalConversations.forEach(conv => {
      console.log(`   - ${conv.id} - ${conv.title}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

cleanEmptyConversations();