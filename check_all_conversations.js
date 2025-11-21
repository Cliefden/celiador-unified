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

async function checkAllConversations() {
  try {
    console.log('Checking all conversations in database...');
    
    // Get all conversations with project info
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        projects!inner(name, id, userid)
      `)
      .order('updatedat', { ascending: false });

    if (convError) {
      console.error('Error getting conversations:', convError);
      return;
    }

    console.log(`Found ${conversations.length} total conversations:`);
    
    const conversationsByProject = {};
    
    conversations.forEach(conv => {
      const projectId = conv.projectid;
      const projectName = conv.projects?.name || 'Unknown';
      
      if (!conversationsByProject[projectId]) {
        conversationsByProject[projectId] = {
          projectName,
          conversations: []
        };
      }
      
      conversationsByProject[projectId].conversations.push(conv);
    });

    // Display conversations grouped by project
    for (const [projectId, data] of Object.entries(conversationsByProject)) {
      console.log(`\n📁 Project: ${data.projectName} (${projectId})`);
      console.log(`   User ID: ${data.conversations[0]?.projects?.userid}`);
      console.log(`   Conversations: ${data.conversations.length}`);
      
      for (const conv of data.conversations.slice(0, 3)) { // Show first 3 conversations
        // Get message count for this conversation
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id')
          .eq('conversationid', conv.id);
        
        const messageCount = msgError ? 0 : messages.length;
        
        console.log(`   - ${conv.title} (${conv.id}) - ${messageCount} messages - Created: ${conv.createdat}`);
      }
    }

    // Check specifically for Project4 conversations that might exist under different conditions
    console.log('\n🔍 Searching for any conversations that might be related to Project4...');
    
    const { data: project4Convs, error: p4Error } = await supabase
      .from('conversations')
      .select('*')
      .ilike('title', '%project4%');
      
    if (!p4Error && project4Convs.length > 0) {
      console.log(`Found ${project4Convs.length} conversations with "project4" in title:`);
      project4Convs.forEach(conv => {
        console.log(`- ${conv.title} (${conv.id}) - Project: ${conv.projectid}`);
      });
    }

    // Also check messages that might reference Project4
    const { data: project4Messages, error: p4MsgError } = await supabase
      .from('messages')
      .select(`
        *,
        conversations!inner(projectid, title)
      `)
      .ilike('content', '%project4%')
      .limit(5);
      
    if (!p4MsgError && project4Messages.length > 0) {
      console.log(`\nFound ${project4Messages.length} messages mentioning "project4":`);
      project4Messages.forEach(msg => {
        console.log(`- Conversation: ${msg.conversations.title} (Project: ${msg.conversations.projectid})`);
        console.log(`  Content: ${msg.content.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllConversations();