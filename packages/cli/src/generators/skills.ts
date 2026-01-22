import path from 'path'
import fs from 'fs-extra'

// Skill configurations matching packages/sandbox/src/skills/config.ts
const SKILL_CONFIGS = [
  {
    id: 'anthropic-chat',
    name: 'AI Chat (Claude)',
    description: 'Add AI text generation with Claude. Use when user wants chatbot, AI assistant, conversational AI, or text generation features.',
  },
  {
    id: 'openai-dalle-3',
    name: 'Image Generation (DALL-E 3)',
    description: 'Add AI image generation with DALL-E 3. Use when user wants to create images from text, AI art, avatars, or visual content generation.',
  },
  {
    id: 'openai-whisper',
    name: 'Speech to Text (Whisper)',
    description: 'Add voice transcription with Whisper. Use when user wants voice input, speech recognition, dictation, or audio transcription.',
  },
  {
    id: 'openai-o3',
    name: 'Advanced Reasoning (O3)',
    description: 'Add advanced AI reasoning. Use when user needs complex problem-solving, multi-step analysis, mathematical reasoning, or strategic thinking.',
  },
  {
    id: 'google-search',
    name: 'Google Search',
    description: 'Add web search capabilities with SerpAPI. Use when user needs real Google search results, web information retrieval, or search interface.',
  },
  {
    id: 'exa-people-search',
    name: 'Exa People Search',
    description: 'Search for people profiles using Exa. Use when user needs to find professionals, executives, or candidates by role, company, or expertise.',
  },
]

export async function generateSkills(skillsDir: string, convexEnabled: boolean): Promise<void> {
  // Generate toolkit API skills
  for (const skill of SKILL_CONFIGS) {
    await generateSkill(skillsDir, skill)
  }

  if (convexEnabled) {
    await generateConvexSkill(skillsDir)
  }
}

async function generateSkill(skillsDir: string, skill: { id: string; name: string; description: string }): Promise<void> {
  const skillDir = path.join(skillsDir, skill.id)
  await fs.ensureDir(skillDir)

  const content = getSkillTemplate(skill.id, skill.name, skill.description)
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
}

function getSkillTemplate(id: string, name: string, description: string): string {
  // Use local API routes (Expo Router API routes)
  const apiBase = '/api'

  switch (id) {
    case 'anthropic-chat':
      return getAnthropicChatTemplate(apiBase, name, description)
    case 'openai-dalle-3':
      return getDalle3Template(apiBase, name, description)
    case 'openai-whisper':
      return getWhisperTemplate(apiBase, name, description)
    case 'openai-o3':
      return getO3Template(apiBase, name, description)
    case 'google-search':
      return getSearchTemplate(apiBase, name, description)
    case 'exa-people-search':
      return getExaTemplate(apiBase, name, description)
    default:
      return `---
name: ${name}
description: ${description}
---

# ${name}

${description}
`
  }
}

function getAnthropicChatTemplate(apiBase: string, name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---

# AI Chat Integration

## When to Use This Skill

Use when the user wants:
- AI text generation or chatbot features
- Conversational AI or Q&A systems
- AI assistant functionality
- Natural language processing

## API Reference

**Endpoint:** \`${apiBase}/llm\`
**Method:** POST

### Request
\`\`\`typescript
{
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
}
\`\`\`

### Response
\`\`\`typescript
{ completion: string }
\`\`\`

## Example Hook

\`\`\`typescript
import { useState } from 'react';

const useAIChat = () => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (userMessage: string, systemPrompt?: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('${apiBase}/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: userMessage }
          ]
        })
      });

      if (!res.ok) throw new Error('Failed to get AI response');

      const data = await res.json();
      setResponse(data.completion);
      return data.completion;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, error, sendMessage };
};
\`\`\`

## Environment Variables

Required: \`ANTHROPIC_API_KEY\`

Add to your \`.env\` file:
\`\`\`
ANTHROPIC_API_KEY=sk-ant-...
\`\`\`
`
}

function getDalle3Template(apiBase: string, name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---

# Image Generation Integration (DALL-E 3)

## When to Use This Skill

Use when the user wants:
- AI image generation from text
- Avatar or artwork creation
- Visual content generation
- Text-to-image features

## API Reference

**Endpoint:** \`${apiBase}/images\`
**Method:** POST

### Request
\`\`\`typescript
{
  prompt: string       // Description of image to generate
  size?: string        // "1024x1024" (default), "512x512", "256x256"
}
\`\`\`

### Response
\`\`\`typescript
{
  image: {
    base64Data: string
    mimeType: string    // "image/png"
  }
  size: string
}
\`\`\`

## Example Hook

\`\`\`typescript
import { useState } from 'react';

const useImageGeneration = () => {
  const [image, setImage] = useState<{ uri: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (prompt: string, size = '1024x1024') => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('${apiBase}/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size })
      });

      if (!res.ok) throw new Error('Failed to generate image');

      const data = await res.json();
      const uri = \`data:\${data.image.mimeType};base64,\${data.image.base64Data}\`;
      setImage({ uri });
      return { uri };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { image, loading, error, generateImage };
};
\`\`\`

## Environment Variables

Required: \`OPENAI_API_KEY\`

Add to your \`.env\` file:
\`\`\`
OPENAI_API_KEY=sk-...
\`\`\`
`
}

function getWhisperTemplate(apiBase: string, name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---

# Speech to Text Integration (Whisper)

## When to Use This Skill

Use when the user wants:
- Voice input or speech recognition
- Audio transcription
- Dictation features
- Voice notes functionality

## API Reference

**Endpoint:** \`${apiBase}/stt\`
**Method:** POST
**Content-Type:** multipart/form-data

### Request
- \`audio\`: File (required) - Audio recording
- \`language\`: string (optional) - Language code (e.g., 'en', 'es')

**Supported formats:** mp3, mp4, mpeg, mpga, m4a, wav, webm

### Response
\`\`\`typescript
{
  text: string        // Transcribed text
  language: string    // Detected language
}
\`\`\`

## Example Hook

\`\`\`typescript
import { useState, useRef } from 'react';
import { Audio } from 'expo-av';

const useSpeechToText = () => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') throw new Error('Permission denied');

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: { extension: '.m4a', outputFormat: 2, audioEncoder: 3 },
      ios: { extension: '.wav', outputFormat: 0, audioQuality: 127 },
    });
    await recording.startAsync();
    recordingRef.current = recording;
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return '';
    setLoading(true);
    setIsRecording(false);

    await recordingRef.current.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recordingRef.current.getURI();
    const formData = new FormData();
    const ext = uri?.split('.').pop() || 'wav';

    formData.append('audio', { uri, name: \`recording.\${ext}\`, type: \`audio/\${ext}\` } as any);

    try {
      const res = await fetch('${apiBase}/stt', { method: 'POST', body: formData });
      const data = await res.json();
      setTranscript(data.text);
      return data.text;
    } finally {
      setLoading(false);
      recordingRef.current = null;
    }
  };

  return { transcript, isRecording, loading, startRecording, stopRecording };
};
\`\`\`

## Environment Variables

Required: \`OPENAI_API_KEY\`
`
}

function getO3Template(apiBase: string, name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---

# Advanced Reasoning Integration

## When to Use This Skill

Use when the user wants:
- Complex problem-solving with step-by-step analysis
- Multi-step reasoning or analysis
- Mathematical or logical reasoning
- Educational tutoring or expert advisor features

## API Reference

Uses the same endpoint as AI Chat but with a reasoning-focused system prompt.

**Endpoint:** \`${apiBase}/llm\`
**Method:** POST

## Example Hook

\`\`\`typescript
import { useState } from 'react';

const REASONING_PROMPT = \`You are an advanced reasoning AI assistant.
Break down complex problems step by step.
Format your response with:
- **Analysis**: Step-by-step reasoning
- **Conclusion**: Final answer
- **Considerations**: Caveats or alternatives\`;

const useAdvancedReasoning = () => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async (problem: string, context?: string) => {
    setLoading(true);

    const systemPrompt = context
      ? \`\${REASONING_PROMPT}\\n\\nContext: \${context}\`
      : REASONING_PROMPT;

    try {
      const res = await fetch('${apiBase}/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: problem }
          ]
        })
      });

      const data = await res.json();
      setResult(data.completion);
      return data.completion;
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, analyze };
};
\`\`\`
`
}

function getSearchTemplate(apiBase: string, name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---

# Google Search Integration (SerpAPI)

## When to Use This Skill

Use when the user wants:
- Real Google search functionality
- Web search results
- Current web information retrieval
- Search interface with actual data

## API Reference

**Endpoint:** \`${apiBase}/search\`
**Method:** POST

### Request
\`\`\`typescript
{
  query: string       // Search query
  gl?: string         // Geographic location (default: "us")
  hl?: string         // Language (default: "en")
  num?: number        // Number of results (default: 10)
}
\`\`\`

### Response
\`\`\`typescript
{
  organicResults: Array<{
    position: number
    title: string
    link: string
    snippet: string
  }>
  searchInformation: { total_results: string }
  knowledgeGraph?: { title: string, description: string }
}
\`\`\`

## Example Hook

\`\`\`typescript
import { useState } from 'react';

const useGoogleSearch = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('${apiBase}/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, num: 10 })
      });

      const data = await res.json();
      setResults(data.organicResults || []);
      return data.organicResults;
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search };
};
\`\`\`

## Environment Variables

Required: \`SERP_API_KEY\`
`
}

function getExaTemplate(apiBase: string, name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---

# Exa People Search Integration

## When to Use This Skill

Use when the user wants:
- Find executives or professionals at companies
- Discover candidates by role, location, expertise
- Search for individuals by name and company
- Build recruiting or networking features

## API Reference

**Endpoint:** \`${apiBase}/exa-search\`
**Method:** POST

### Request
\`\`\`typescript
{
  query: string         // Search query
  numResults?: number   // Number of results (default: 10)
}
\`\`\`

### Response
\`\`\`typescript
{
  results: Array<{
    title: string       // Person's name and title
    url: string         // Profile URL
    score?: number      // Relevance score
  }>
}
\`\`\`

## Example Queries

- "VP of product at Figma"
- "Director of sales operations in Chicago SaaS"
- "Senior software engineer at Google"

## Example Hook

\`\`\`typescript
import { useState } from 'react';

const useExaPeopleSearch = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (query: string, numResults = 10) => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('${apiBase}/exa-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, numResults })
      });

      const data = await res.json();
      setResults(data.results || []);
      return data.results;
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search };
};
\`\`\`

## Environment Variables

Required: \`EXA_API_KEY\`
`
}

async function generateConvexSkill(skillsDir: string): Promise<void> {
  const skillDir = path.join(skillsDir, 'convex')
  await fs.ensureDir(skillDir)

  const content = `---
name: Convex Backend
description: Convex backend development for React Native. Use for database queries, mutations, actions, real-time subscriptions, file storage, or authentication. Triggered by convex, database, query, mutation, action, realtime, backend keywords.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Convex Backend Development

## Function Types

\`\`\`typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("messages").collect(),
});

export const create = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => ctx.db.insert("messages", args),
});
\`\`\`

## Client Usage

\`\`\`typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

const data = useQuery(api.messages.list);
const create = useMutation(api.messages.create);

// Conditional: use "skip" pattern
const user = useQuery(api.users.get, userId ? { userId } : "skip");
\`\`\`

## Index Rules

- NEVER define \`by_id\` or \`by_creation_time\` (system-provided)
- Don't include \`_creationTime\` as last column
`

  await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
}
