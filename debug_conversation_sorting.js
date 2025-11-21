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

async function debugConversationSorting() {
  const projectId = '913784dd-6719-4a00-924b-b6993779d414'; // Project4
  const userId = 'bed94e99-1ed1-4322-b05f-cdfdf2e9dbc0';   // User ID from logs
  
  console.log('🔍 Debugging conversation sorting logic...');
  
  try {
    // Get all conversations (simulating frontend query)
    const { data: allConversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .eq('status', 'ACTIVE')
      .order('updatedat', { ascending: false });

    console.log(`\n✅ Found ${allConversations.length} conversations`);

    // Simulate the exact frontend sorting logic
    console.log('\n📊 Checking message counts for each conversation...');
    
    const conversationsWithMessageCounts = await Promise.all(
      allConversations.map(async (conv) => {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, createdat')
          .eq('conversationid', conv.id)
          .order('createdat', { ascending: false })
          .limit(1);
        
        const messageCount = messages?.length || 0;
        const latestMessageDate = messages?.[0]?.createdat || null;
        
        console.log(`   ${conv.id.substring(0, 8)}... - ${messageCount} messages - Latest: ${latestMessageDate || 'none'}`);
        
        return {
          ...conv,
          messageCount,
          latestMessageDate
        };
      })
    );

    console.log('\n🔄 Before sorting (original order):');
    conversationsWithMessageCounts.forEach((conv, i) => {
      console.log(`   ${i + 1}. ${conv.id.substring(0, 8)}... - ${conv.messageCount} messages - Updated: ${conv.updatedat}`);
    });

    // Apply the exact frontend sorting logic
    const sortedConversations = conversationsWithMessageCounts.sort((a, b) => {
      if (a.messageCount > 0 && b.messageCount === 0) return -1;
      if (a.messageCount === 0 && b.messageCount > 0) return 1;
      if (a.messageCount > 0 && b.messageCount > 0) {
        return new Date(b.latestMessageDate).getTime() - new Date(a.latestMessageDate).getTime();
      }
      return new Date(b.updatedat).getTime() - new Date(a.updatedat).getTime();
    });

    console.log('\n✅ After sorting (frontend logic):');
    sortedConversations.forEach((conv, i) => {
      console.log(`   ${i + 1}. ${conv.id.substring(0, 8)}... - ${conv.messageCount} messages - ${i === 0 ? '🎯 SELECTED' : ''}`);
    });

    console.log('\n🎯 Frontend would select conversation:', sortedConversations[0].id);
    console.log(`   Title: ${sortedConversations[0].title}`);
    console.log(`   Message count: ${sortedConversations[0].messageCount}`);
    console.log(`   Expected: 0a66024b-bfbf-4808-8e13-61eabaa5c9ac (with 12 messages)`);

  } catch (error) {
    console.error('Error:', error);
  }
}

debugConversationSorting();