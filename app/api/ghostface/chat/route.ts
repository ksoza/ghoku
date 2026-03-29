// app/api/ghostface/chat/route.ts
// GhOSTface AGI Chat — Autonomous agent with tools, planning, and memory
import { NextRequest, NextResponse } from 'next/server';
import { runGhostfaceAgent, createDefaultMemory } from '@/lib/agents/ghostface-agent';
import type { AgentMessage } from '@/lib/agents/types';

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      repo,
      context,
      memory,
      history,
      mode = 'agent', // 'agent' | 'simple'
    } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build history
    const agentHistory: AgentMessage[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h.role === 'user' || h.role === 'assistant') {
          agentHistory.push({ role: h.role, content: h.content });
        }
      }
    }

    // ── Agent Mode (default) — Full AGI agent ─────────────────
    if (mode === 'agent') {
      const agentMemory = memory
        ? { ...createDefaultMemory(), ...memory }
        : createDefaultMemory();

      const result = await runGhostfaceAgent(
        message,
        agentHistory,
        { repo, code: context },
        agentMemory,
      );

      return NextResponse.json({
        response: result.response,
        toolsUsed: result.toolsUsed,
        memory: result.memory,
        suggestedActions: result.suggestedActions,
        mode: 'agent',
      });
    }

    // ── Simple Mode — Direct API call, no tools ───────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: '⚠️ ANTHROPIC_API_KEY not configured. Set it in environment variables.' },
        { status: 200 },
      );
    }

    let systemPrompt = `You are GhOSTface (Generative Heuristic Orchestration System — Transformative Face Engine) — an AI brain that searches, scans, and synthesizes GitHub repos in real time.

Style: Be concise but thorough. Use code blocks with language tags. Be opinionated. Generate WORKING, copy-paste ready code.`;

    if (repo) {
      systemPrompt += `\n\nLoaded repo: ${repo.full_name}\nDescription: ${repo.description}\nLanguage: ${repo.language}`;
      if (repo.readme) systemPrompt += `\nREADME: ${repo.readme.slice(0, 2000)}`;
    }
    if (context) systemPrompt += `\n\nUser's code:\n${context.slice(0, 3000)}`;
    if (memory?.operator) {
      systemPrompt += `\n\nOperator: ${memory.operator}`;
      if (memory.stack?.length) systemPrompt += `\nStack: ${memory.stack.join(', ')}`;
    }

    const messages = agentHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { response: `⚠️ AI error (${response.status}).` },
        { status: 200 },
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || 'No response generated.';

    return NextResponse.json({ response: text, mode: 'simple' });
  } catch (err: any) {
    console.error('GhOSTface chat error:', err);
    return NextResponse.json(
      { response: `⚠️ Error: ${err.message}` },
      { status: 500 },
    );
  }
}
