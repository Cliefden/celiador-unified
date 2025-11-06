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

async function debugConversationLoading() {
  const projectId = '913784dd-6719-4a00-924b-b6993779d414'; // Project4
  const userId = 'bed94e99-1ed1-4322-b05f-cdfdf2e9dbc0';   // User ID from logs
  
  console.log('🔍 Debugging conversation loading for:');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   User ID: ${userId}`);
  
  try {
    // Simulate the exact query the frontend is making
    console.log('\n1️⃣ Running exact frontend query...');
    const { data: allConversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .eq('status', 'ACTIVE')
      .order('updatedat', { ascending: false });

    if (convError) {
      console.error('❌ Error in conversation query:', convError);
      return;
    }

    console.log(`✅ Found ${allConversations.length} conversations with exact frontend query`);
    allConversations.forEach((conv, i) => {
      console.log(`   ${i + 1}. ${conv.id} - "${conv.title}" (${conv.status})`);
    });

    // Let's also check what happens if we remove some filters
    console.log('\n2️⃣ Checking conversations without status filter...');
    const { data: withoutStatus } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .order('updatedat', { ascending: false });

    console.log(`✅ Found ${withoutStatus.length} conversations without status filter`);
    withoutStatus.forEach((conv, i) => {
      console.log(`   ${i + 1}. ${conv.id} - "${conv.title}" (${conv.status})`);
    });

    // Check the specific conversation we know exists
    console.log('\n3️⃣ Checking the specific conversation we know exists...');
    const knownConvId = '0a66024b-bfbf-4808-8e13-61eabaa5c9ac';
    const { data: knownConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', knownConvId)
      .single();

    if (knownConv) {
      console.log(`✅ Known conversation found:`);
      console.log(`   ID: ${knownConv.id}`);
      console.log(`   Title: ${knownConv.title}`);
      console.log(`   Status: ${knownConv.status}`);
      console.log(`   Project ID: ${knownConv.projectid}`);
      console.log(`   User ID: ${knownConv.userid}`);
      console.log(`   Updated: ${knownConv.updatedat}`);
      
      // Check messages for this conversation
      const { data: messages } = await supabase
        .from('messages')
        .select('id, role, createdat')
        .eq('conversationid', knownConv.id)
        .order('createdat', { ascending: true });
        
      console.log(`   Messages: ${messages.length}`);
    } else {
      console.log('❌ Known conversation not found');
    }

    // Check if there are any conversations with a slightly different user ID
    console.log('\n4️⃣ Checking for any conversations for this project with any user...');
    const { data: anyConvs } = await supabase
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .order('updatedat', { ascending: false });

    console.log(`✅ Found ${anyConvs.length} conversations for project (any user)`);
    anyConvs.forEach((conv, i) => {
      console.log(`   ${i + 1}. ${conv.id} - User: ${conv.userid} - Status: ${conv.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

debugConversationLoading();