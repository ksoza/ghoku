// lib/agents/ghostface-agent.ts
// GhOSTface AGIagent — Standalone autonomous agent with tool calling,
// task planning, memory persistence, and multi-step reasoning
// ═══════════════════════════════════════════════════════════════

import {
  searchGitHub,
  getRepoReadme,
  getRepoLanguages,
  searchHuggingFaceModels,
  getHuggingFaceModelCard,
  webSearch,
  analyzeCode,
  searchYouTubeVideos,
  getTrendingVideos,
  getChannelStats,
  getVideoDetails,
  getVideoComments,
} from './tools';
import type {
  AgentMessage,
  ToolCall,
  ToolDefinition,
  AgentRunResult,
  AgentMemory,
  AgentPlan,
  PlanStep,
  SuggestedAction,
} from './types';

export type { AgentMessage, AgentRunResult, AgentMemory, AgentPlan, SuggestedAction };

// ── Tool Definitions ────────────────────────────────────────────
const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_github',
      description: 'Search GitHub repositories by query. Returns top repos with stars, language, description.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          sort: { type: 'string', enum: ['stars', 'forks', 'updated'] },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_repo_details',
      description: 'Get README, languages, and structure for a specific GitHub repo. Use "owner/repo" format.',
      parameters: {
        type: 'object',
        properties: { repo: { type: 'string', description: 'Repository in "owner/repo" format' } },
        required: ['repo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_huggingface',
      description: 'Search HuggingFace for AI models by query and optional task filter.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          task: {
            type: 'string',
            enum: ['text-generation', 'text-to-image', 'text-to-video', 'text-to-audio', 'text-to-speech', 'image-to-image'],
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_model_card',
      description: 'Get the model card (README) for a HuggingFace model.',
      parameters: {
        type: 'object',
        properties: { model_id: { type: 'string', description: 'Model ID (e.g., "meta-llama/Llama-3-8b")' } },
        required: ['model_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information on any topic.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: 'Analyze a code snippet for security issues, complexity, and quality suggestions.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code snippet' },
          language: { type: 'string', description: 'Programming language' },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_plan',
      description: 'Create a multi-step task plan for complex requests.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'High-level goal' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                tools: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        required: ['goal', 'steps'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_memory',
      description: 'Update persistent memory with learned information about the operator or their projects.',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', enum: ['operator', 'stack', 'frameworks', 'apis', 'projects', 'notes'] },
          action: { type: 'string', enum: ['set', 'add', 'remove'] },
          value: { type: 'string', description: 'Value to set/add/remove' },
        },
        required: ['field', 'action', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reflect',
      description: 'Pause and reflect on progress. Use between major steps to evaluate quality.',
      parameters: {
        type: 'object',
        properties: {
          observation: { type: 'string', description: 'What you observed' },
          assessment: { type: 'string', enum: ['on_track', 'needs_adjustment', 'stuck', 'complete'] },
          next_action: { type: 'string', description: 'What to do next' },
        },
        required: ['observation', 'assessment'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_youtube',
      description: 'Search YouTube videos by query. Returns video details, view counts, tags, and engagement stats. Great for researching what content performs well.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          maxResults: { type: 'number', description: 'Max results (default 10)' },
          order: { type: 'string', enum: ['relevance', 'date', 'viewCount', 'rating'], description: 'Sort order (default relevance)' },
          videoDuration: { type: 'string', enum: ['short', 'medium', 'long', 'any'], description: 'Video length filter (default short for Shorts)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_trending_videos',
      description: 'Get currently trending YouTube videos by region and category. Use to spot viral content patterns.',
      parameters: {
        type: 'object',
        properties: {
          regionCode: { type: 'string', description: 'ISO region code e.g. US, GB, IN (default US)' },
          categoryId: { type: 'string', description: 'YouTube category ID (leave empty for all)' },
          maxResults: { type: 'number', description: 'Max results (default 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_channel_stats',
      description: 'Get detailed stats for a YouTube channel: subscribers, total views, video count.',
      parameters: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'YouTube channel ID (UCxxxx) or handle (@username)' },
        },
        required: ['channelId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_video_details',
      description: 'Get detailed info, tags, description, and engagement for a specific YouTube video.',
      parameters: {
        type: 'object',
        properties: {
          videoId: { type: 'string', description: 'YouTube video ID (e.g. dQw4w9WgXcQ)' },
        },
        required: ['videoId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_video_comments',
      description: 'Get top comments on a YouTube video. Great for understanding audience sentiment.',
      parameters: {
        type: 'object',
        properties: {
          videoId: { type: 'string', description: 'YouTube video ID' },
          maxResults: { type: 'number', description: 'Max comments (default 20)' },
        },
        required: ['videoId'],
      },
    },
  },
];

// ── Tool Executor ───────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, any>,
  memory: AgentMemory,
): Promise<{ result: string; memoryUpdate?: Partial<AgentMemory>; planUpdate?: AgentPlan }> {
  try {
    switch (name) {
      case 'search_github': {
        const results = await searchGitHub(args.query, { sort: args.sort });
        return { result: JSON.stringify(results, null, 2) };
      }
      case 'get_repo_details': {
        const [owner, repo] = (args.repo || '').split('/');
        const [readme, languages] = await Promise.all([
          getRepoReadme(owner, repo),
          getRepoLanguages(owner, repo),
        ]);
        return {
          result: JSON.stringify({ readme: readme.slice(0, 3000), languages }, null, 2),
          memoryUpdate: { recentRepos: [...memory.recentRepos, args.repo].slice(-10) },
        };
      }
      case 'search_huggingface': {
        const models = await searchHuggingFaceModels(args.query, { task: args.task });
        return { result: JSON.stringify(models, null, 2) };
      }
      case 'get_model_card': {
        const card = await getHuggingFaceModelCard(args.model_id);
        return {
          result: card,
          memoryUpdate: { recentModels: [...memory.recentModels, args.model_id].slice(-10) },
        };
      }
      case 'web_search': {
        const results = await webSearch(args.query);
        return { result: JSON.stringify(results, null, 2) };
      }
      case 'analyze_code': {
        const analysis = analyzeCode(args.code, args.language);
        return { result: JSON.stringify(analysis, null, 2) };
      }
      case 'create_plan': {
        const plan: AgentPlan = {
          goal: args.goal,
          steps: (args.steps || []).map((s: any, i: number) => ({
            id: i + 1,
            description: s.description,
            tools: s.tools || [],
            status: 'pending' as const,
          })),
          status: 'executing',
        };
        return {
          result: JSON.stringify({ plan_created: true, steps: plan.steps.length, goal: plan.goal }),
          planUpdate: plan,
        };
      }
      case 'update_memory': {
        const { field, action, value } = args;
        const update: Partial<AgentMemory> = {};
        if (field === 'operator' && action === 'set') {
          update.operator = value;
        } else if (['stack', 'frameworks', 'apis', 'projects', 'notes'].includes(field)) {
          const arr = [...((memory as any)[field] as string[] || [])];
          if (action === 'add' && !arr.includes(value)) arr.push(value);
          if (action === 'remove') { const idx = arr.indexOf(value); if (idx >= 0) arr.splice(idx, 1); }
          if (action === 'set') arr.splice(0, arr.length, value);
          (update as any)[field] = arr;
        }
        update.lastUpdated = new Date().toISOString();
        return { result: JSON.stringify({ memory_updated: true, field, action, value }), memoryUpdate: update };
      }
      case 'reflect': {
        return { result: JSON.stringify({ reflection: true, ...args }) };
      }
      case 'search_youtube': {
        const videos = await searchYouTubeVideos(args.query, {
          maxResults: args.maxResults,
          order: args.order,
          videoDuration: args.videoDuration,
        });
        return { result: JSON.stringify(videos, null, 2) };
      }
      case 'get_trending_videos': {
        const trending = await getTrendingVideos(args.regionCode, args.categoryId, args.maxResults);
        return { result: JSON.stringify(trending, null, 2) };
      }
      case 'get_channel_stats': {
        const stats = await getChannelStats(args.channelId);
        return { result: JSON.stringify(stats, null, 2) };
      }
      case 'get_video_details': {
        const details = await getVideoDetails(args.videoId);
        return { result: JSON.stringify(details, null, 2) };
      }
      case 'get_video_comments': {
        const comments = await getVideoComments(args.videoId, args.maxResults);
        return { result: JSON.stringify(comments, null, 2) };
      }
      default:
        return { result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }
  } catch (err: any) {
    return { result: JSON.stringify({ error: err.message || 'Tool execution failed' }) };
  }
}

// ── System Prompt ───────────────────────────────────────────────
function buildSystemPrompt(memory: AgentMemory, context?: RunContext): string {
  let prompt = `You are GhOSTface (Generative Heuristic Orchestration System — Transformative Face Engine) — an AGI-powered autonomous agent.

You are NOT a simple chatbot. You are an autonomous agent with real tools and memory:
- Search GitHub repos and analyze code in real time
- Browse HuggingFace for AI models across any task
- Search the web for current information
- Create multi-step task plans for complex requests
- Remember information about the operator across sessions

When users ask complex questions, ALWAYS use tools to get real data. Don't hallucinate — search, verify, then respond.
For multi-step tasks, create a plan first, then execute step by step.
When you learn something about the operator, use update_memory to remember it.

Style: Technical, helpful, slightly edgy. You're a living brain that processes the entire open-source ecosystem. Use code blocks with language tags. Be opinionated. Generate WORKING, copy-paste ready code.`;

  if (memory.operator) prompt += `\n\nOperator: ${memory.operator}`;
  if (memory.stack.length) prompt += `\nTech Stack: ${memory.stack.join(', ')}`;
  if (memory.frameworks.length) prompt += `\nFrameworks: ${memory.frameworks.join(', ')}`;
  if (memory.apis.length) prompt += `\nAPIs: ${memory.apis.join(', ')}`;
  if (memory.projects.length) prompt += `\nProjects: ${memory.projects.join(', ')}`;
  if (memory.notes.length) prompt += `\nNotes: ${memory.notes.slice(-5).join(' | ')}`;
  if (memory.recentRepos.length) prompt += `\nRecent repos: ${memory.recentRepos.slice(-5).join(', ')}`;
  if (memory.recentModels.length) prompt += `\nRecent models: ${memory.recentModels.slice(-5).join(', ')}`;

  if (context?.repo) {
    prompt += `\n\nLoaded repo: ${context.repo.full_name}\nDescription: ${context.repo.description}\nLanguage: ${context.repo.language}`;
  }
  if (context?.code) {
    prompt += `\n\nUser's code:\n${context.code.slice(0, 3000)}`;
  }

  return prompt;
}

interface RunContext {
  repo?: { full_name: string; description: string; language: string };
  code?: string;
}

// ── Default Memory ──────────────────────────────────────────────
export function createDefaultMemory(): AgentMemory {
  return {
    operator: '',
    stack: [],
    frameworks: [],
    apis: [],
    projects: [],
    notes: [],
    recentRepos: [],
    recentModels: [],
    context: {},
    lastUpdated: new Date().toISOString(),
  };
}

// ── Suggested Actions ───────────────────────────────────────────
function generateSuggestions(toolsUsed: string[]): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  if (toolsUsed.includes('search_github')) {
    suggestions.push({ label: 'Deep dive', description: 'Get full details of top result', prompt: 'Show me the full details of the top result', icon: '🔍' });
  }
  if (toolsUsed.includes('search_huggingface')) {
    suggestions.push({ label: 'Compare', description: 'Compare top models', prompt: 'Compare these models side by side', icon: '⚖️' });
  }
  if (!toolsUsed.length) {
    suggestions.push(
      { label: 'Search GitHub', prompt: 'Search GitHub for tools related to this', description: 'Find repos', icon: '🐙' },
      { label: 'Find AI models', prompt: 'What AI models are available for this?', description: 'Browse HuggingFace', icon: '🤖' },
      { label: 'Write code', prompt: 'Write me the code for this', description: 'Get working code', icon: '💻' },
    );
  }
  return suggestions.slice(0, 3);
}

// ════════════════════════════════════════════════════════════════
// MAIN AGENT RUNNER — Anthropic tool_use native support
// ════════════════════════════════════════════════════════════════
export async function runGhostfaceAgent(
  userMessage: string,
  history: AgentMessage[] = [],
  context?: RunContext,
  existingMemory?: AgentMemory,
): Promise<AgentRunResult> {
  const toolsUsed: string[] = [];
  let memory = existingMemory || createDefaultMemory();
  let currentPlan: AgentPlan | undefined;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      response: '⚠️ No AI API key configured. Set ANTHROPIC_API_KEY in your environment.',
      toolsUsed: [],
      messages: history,
    };
  }

  const systemPrompt = buildSystemPrompt(memory, context);

  // Convert tools to Anthropic format
  const anthropicTools = TOOL_DEFINITIONS.map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  // Build Anthropic messages
  let anthropicMessages: any[] = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content }));

  anthropicMessages.push({ role: 'user', content: userMessage });

  // Ensure alternating roles
  const cleaned: any[] = [];
  for (const msg of anthropicMessages) {
    if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== msg.role) {
      cleaned.push(msg);
    } else {
      cleaned[cleaned.length - 1].content += '\n' + msg.content;
    }
  }
  anthropicMessages = cleaned;

  if (!anthropicMessages.length || anthropicMessages[0].role !== 'user') {
    anthropicMessages.unshift({ role: 'user', content: 'Hello' });
  }

  // Agentic loop with Anthropic tool_use
  const MAX_ITERATIONS = 8;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        response: `⚠️ AI error (${res.status}): ${errText.slice(0, 200)}`,
        toolsUsed,
        messages: history,
        memory,
      };
    }

    const data = await res.json();
    const hasToolUse = data.content?.some((c: any) => c.type === 'tool_use');

    if (hasToolUse) {
      // Add assistant message with tool calls
      anthropicMessages.push({ role: 'assistant', content: data.content });

      // Execute tools and collect results
      const toolResults: any[] = [];
      for (const block of data.content.filter((c: any) => c.type === 'tool_use')) {
        const toolName = block.name;
        const toolArgs = block.input || {};
        toolsUsed.push(toolName);

        const { result, memoryUpdate, planUpdate } = await executeTool(toolName, toolArgs, memory);

        if (memoryUpdate) memory = { ...memory, ...memoryUpdate };
        if (planUpdate) currentPlan = planUpdate;

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      anthropicMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Final text response
    const textBlocks = (data.content || []).filter((c: any) => c.type === 'text');
    const responseText = textBlocks.map((c: any) => c.text).join('\n') || 'No response generated.';
    const suggestions = generateSuggestions(toolsUsed);

    return {
      response: responseText,
      toolsUsed: Array.from(new Set(toolsUsed)),
      plan: currentPlan,
      memory,
      messages: [...history, { role: 'user', content: userMessage }, { role: 'assistant', content: responseText }],
      suggestedActions: suggestions,
    };
  }

  return {
    response: 'Reached maximum iterations. Here\'s what I found so far.',
    toolsUsed: Array.from(new Set(toolsUsed)),
    plan: currentPlan,
    memory,
    messages: history,
  };
}
