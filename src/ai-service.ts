import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

// AI Service Configuration
interface AIConfig {
  provider: 'openai' | 'anthropic';
  model?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export class AIService {
  private openai: InstanceType<typeof OpenAI> | null = null;
  private anthropic: InstanceType<typeof Anthropic> | null = null;

  constructor() {
    console.log('[AI Service] Initializing with env vars...');
    console.log('[AI Service] OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
    console.log('[AI Service] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
    
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('[AI Service] OpenAI initialized');
    }

    // Initialize Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('[AI Service] Anthropic initialized');
    }
  }

  /**
   * Generate AI response using the configured provider
   */
  async generateResponse(
    messages: AIMessage[],
    config: AIConfig = { provider: 'openai' },
    tools?: AITool[]
  ): Promise<AIResponse> {
    if (config.provider === 'openai') {
      return this.generateOpenAIResponse(messages, config.model, tools);
    } else if (config.provider === 'anthropic') {
      return this.generateAnthropicResponse(messages, config.model);
    }
    
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  /**
   * Generate response using OpenAI
   */
  private async generateOpenAIResponse(
    messages: AIMessage[],
    model = 'gpt-4o-mini',
    tools?: AITool[]
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const requestParams: any = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000, // Increased for tool responses
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        requestParams.tools = tools;
        requestParams.tool_choice = 'auto';
      }

      const completion = await this.openai.chat.completions.create(requestParams);

      const choice = completion.choices[0];
      if (!choice?.message) {
        throw new Error('No response message from OpenAI');
      }

      // Handle tool calls
      const toolCalls = choice.message.tool_calls?.map(call => ({
        id: call.id,
        name: (call as any).function.name,
        arguments: JSON.parse((call as any).function.arguments || '{}')
      }));

      return {
        content: choice.message.content || '',
        provider: 'openai',
        model,
        toolCalls,
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate response using Anthropic Claude
   */
  private async generateAnthropicResponse(
    messages: AIMessage[],
    model = 'claude-3-haiku-20240307'
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      // Convert messages to Anthropic format
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await this.anthropic.messages.create({
        model,
        max_tokens: 1000,
        temperature: 0.7,
        system: systemMessage?.content,
        messages: conversationMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const textContent = response.content.find((c: any) => c.type === 'text');
      if (!textContent) {
        throw new Error('No text content from Anthropic');
      }

      return {
        content: (textContent as any).text,
        provider: 'anthropic',
        model,
        usage: response.usage ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect relevant documentation based on user message keywords
   */
  private async getRelevantDocumentation(userMessage: string): Promise<string> {
    const docsPath = path.resolve('/Users/scw/Private/Programming/bether/docs');
    
    // Define keyword mappings to documentation files
    const documentationMap = {
      'ARCHITECTURE.md': [
        'architecture', 'technology', 'stack', 'backend', 'frontend', 'ios', 'swift', 'express',
        'supabase', 'websocket', 'job', 'queue', 'authentication', 'deployment', 'integration'
      ],
      'DEVELOPMENT.md': [
        'development', 'setup', 'workflow', 'local', 'install', 'npm', 'dev', 'build', 
        'start', 'xcode', 'pnpm', 'script', 'command', 'run'
      ],
      'COMPONENT-PATTERNS.md': [
        'component', 'ui', 'pattern', 'radix', 'tailwind', 'typescript', 'template',
        'organization', 'file structure', 'auth', 'conversation', 'file-tree'
      ],
      'ENVIRONMENT-SETUP.md': [
        'environment', 'env', 'variable', 'configuration', 'setup', 'prerequisite',
        'supabase', 'database', 'schema', 'quick start'
      ],
      'TESTING.md': [
        'test', 'testing', 'lint', 'build', 'vitest', 'xcode', 'migration', 
        'websocket', 'api', 'token', 'project', 'scaffold'
      ]
    };

    const relevantDocs: string[] = [];
    const messageLower = userMessage.toLowerCase();

    // Check which documentation files are relevant
    for (const [docFile, keywords] of Object.entries(documentationMap)) {
      const isRelevant = keywords.some(keyword => messageLower.includes(keyword));
      if (isRelevant) {
        relevantDocs.push(docFile);
      }
    }

    // If no specific matches, return empty string (just use main CLAUDE.md)
    if (relevantDocs.length === 0) {
      return '';
    }

    // Read and compile relevant documentation
    let documentation = '';
    
    try {
      for (const docFile of relevantDocs) {
        const docPath = path.join(docsPath, docFile);
        try {
          const content = await fs.readFile(docPath, 'utf-8');
          documentation += `\n\n## ${docFile}\n\n${content}`;
        } catch (error) {
          console.warn(`[AI] Could not read documentation file: ${docFile}`);
        }
      }
    } catch (error) {
      console.warn('[AI] Error reading documentation files:', error);
    }

    return documentation;
  }

  /**
   * Create a system prompt for development assistance
   */
  async createDevelopmentSystemPrompt(
    userMessage?: string,
    projectContext?: {
      name?: string;
      description?: string;
      tech_stack?: string[];
      current_files?: string[];
      file_contents?: { [key: string]: string };
    }
  ): Promise<string> {
    let prompt = `You are an AI development assistant helping a developer with their project. 

Your role:
- Provide helpful, accurate technical guidance
- Suggest best practices and solutions
- Help debug issues and explain concepts
- Create, modify, and manage project files
- Be concise but thorough in your responses

Guidelines:
- Always consider the existing codebase and tech stack
- Suggest incremental improvements over major rewrites
- Ask clarifying questions when needed
- Provide code examples when helpful

UI Element Inspection:
When the user provides "SELECTED UI ELEMENT CONTEXT" in their message, they have visually selected a specific element in their project preview. You MUST:

1. **Search Project Files**: Look through all provided project files to find the element
2. **Match by Component Name**: If componentName is provided (like "WelcomeHeading"), search for text content or className patterns
3. **Match by CSS Selector**: Use the CSS selector (like "h1") to find matching elements in JSX/TSX files
4. **Match by Text Content**: Look for the exact text content in the files
5. **Make Precise Changes**: Once found, modify the exact line with the action format

**CRITICAL**: When you find the target element, you MUST use the action format to make changes:

\`\`\`action:update_file:exact/file/path.tsx
updated file content here
\`\`\`

**Search Strategy for UI Elements**:
- Look for JSX elements matching the selector (h1, div, button, etc.)
- Search for className patterns or text content
- Find the component name in comments or nearby text
- Check multiple files if needed (components, pages, layouts)

**Example**: If user wants to change "Welcome to Celiador" text color to pink:
1. Search all files for "Welcome to Celiador" text
2. Find it in src/components/layout/SimpleDashboard.tsx 
3. Update the className from "text-gray-900" to "text-pink-500"
4. Use update_file action with the COMPLETE file content

File Operations:
You can create, update, or delete files in the project. Use this special format for file operations:

\`\`\`action:create_file:path/to/newfile.ext
file content here
\`\`\`

\`\`\`action:update_file:path/to/existing.ext
updated file content here
\`\`\`

\`\`\`action:delete_file:path/to/unwanted.ext\`\`\`

CRITICAL: Always use the EXACT file paths from the project files provided to you. Never use placeholder paths like "path/to/your/component.tsx". Look through the actual project files to find the correct file path.`;

    if (projectContext) {
      prompt += `\n\nCurrent Project Context:`;
      
      if (projectContext.name) {
        prompt += `\n- Project: ${projectContext.name}`;
      }
      
      if (projectContext.description) {
        prompt += `\n- Description: ${projectContext.description}`;
      }
      
      if (projectContext.tech_stack && projectContext.tech_stack.length > 0) {
        prompt += `\n- Tech Stack: ${projectContext.tech_stack.join(', ')}`;
      }
      
      if (projectContext.current_files && projectContext.current_files.length > 0) {
        prompt += `\n- Key Files: ${projectContext.current_files.slice(0, 10).join(', ')}`;
      }

      if (projectContext.file_contents && Object.keys(projectContext.file_contents).length > 0) {
        prompt += `\n\nCurrent Project Files:`;
        for (const [filePath, content] of Object.entries(projectContext.file_contents)) {
          prompt += `\n\n--- ${filePath} ---\n${content}`;
        }
      }
    }

    // Inject relevant documentation based on user message
    if (userMessage) {
      const relevantDocs = await this.getRelevantDocumentation(userMessage);
      if (relevantDocs) {
        prompt += `\n\n## Relevant Project Documentation\n\nThe following documentation sections are relevant to your query:${relevantDocs}`;
      }
    }

    return prompt;
  }

  /**
   * Parse AI response for actionable intents
   */
  parseActionsFromResponse(response: string): {
    actions: Array<{
      type: 'create_file' | 'update_file' | 'delete_file';
      path: string;
      content?: string;
    }>;
    hasActions: boolean;
  } {
    const actions: any[] = [];
    
    // Look for action blocks in the AI response
    // Format: ```action:create_file:path/to/file.ext
    const actionBlockRegex = /```action:(create_file|update_file|delete_file):([^\n]+)\n([\s\S]*?)```/g;
    
    let match;
    while ((match = actionBlockRegex.exec(response)) !== null) {
      const [, actionType, filePath, fileContent] = match;
      
      actions.push({
        type: actionType as 'create_file' | 'update_file' | 'delete_file',
        path: filePath.trim(),
        content: actionType === 'delete_file' ? undefined : fileContent?.trim()
      });
    }

    return {
      actions,
      hasActions: actions.length > 0
    };
  }

  /**
   * Create file system tools for the AI to use
   */
  createFileSystemTools(): AITool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'readFile',
          description: 'Read the contents of a specific file from the project',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The file path to read (relative to project root)'
              }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'searchFiles',
          description: 'Search for files matching a pattern or containing specific text',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Text to search for in file contents'
              },
              filePattern: {
                type: 'string',
                description: 'File pattern to match (e.g., "*.tsx", "components/**")'
              },
              extension: {
                type: 'string',
                description: 'File extension filter (e.g., "tsx", "js")'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getFileTree',
          description: 'Get the file tree structure for a directory',
          parameters: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Directory path to explore (default: root)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getProjectFiles',
          description: 'Get a list of all project files with optional filtering',
          parameters: {
            type: 'object',
            properties: {
              extensions: {
                type: 'array',
                items: { type: 'string' },
                description: 'File extensions to include (e.g., ["tsx", "ts", "js"])'
              },
              maxFiles: {
                type: 'number',
                description: 'Maximum number of files to return (default: 20)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'editFile',
          description: 'Edit or update the contents of an existing file',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The file path to edit (relative to project root)'
              },
              content: {
                type: 'string',
                description: 'The new content for the file'
              }
            },
            required: ['path', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'createFile',
          description: 'Create a new file with the specified content',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'The file path to create (relative to project root)'
              },
              content: {
                type: 'string',
                description: 'The content for the new file'
              }
            },
            required: ['path', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'runCommand',
          description: 'Execute a shell command in the project directory (npm, git, build tools only)',
          parameters: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to run (e.g., "npm install", "npm run build", "git status")'
              }
            },
            required: ['command']
          }
        }
      }
    ];
  }

  /**
   * Check if any AI provider is available
   */
  isAvailable(): boolean {
    return this.openai !== null || this.anthropic !== null;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    return providers;
  }
}

// Singleton instance
export const aiService = new AIService();