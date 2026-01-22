import path from 'path'
import fs from 'fs-extra'

// Skill-based commands matching the toolkit APIs
const SKILL_COMMANDS = [
  {
    id: 'ai-chat',
    name: 'AI Chat',
    description: 'Add AI text generation with Claude to your app',
    endpoint: '/api/llm',
  },
  {
    id: 'image-gen',
    name: 'Image Generation',
    description: 'Add DALL-E 3 image generation to your app',
    endpoint: '/api/images',
  },
  {
    id: 'speech-to-text',
    name: 'Speech to Text',
    description: 'Add Whisper voice transcription to your app',
    endpoint: '/api/stt',
  },
  {
    id: 'search',
    name: 'Google Search',
    description: 'Add Google search via SerpAPI to your app',
    endpoint: '/api/search',
  },
  {
    id: 'people-search',
    name: 'People Search',
    description: 'Add Exa people search to your app',
    endpoint: '/api/exa-search',
  },
]

export async function generateCommands(commandsDir: string, convexEnabled: boolean): Promise<void> {
  // Skill-based commands
  await generateAIChatCommand(commandsDir)
  await generateImageGenCommand(commandsDir)
  await generateSpeechToTextCommand(commandsDir)
  await generateSearchCommand(commandsDir)
  await generatePeopleSearchCommand(commandsDir)

  // Utility commands
  await generateBuildCommand(commandsDir)
  await generateComponentCommand(commandsDir)
  await generateScreenCommand(commandsDir)
  await generateFixCommand(commandsDir)

  if (convexEnabled) {
    await generateConvexCommand(commandsDir)
  }
}

async function generateAIChatCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Add AI chat/text generation feature using Claude
allowed-tools: Write, Read, Glob, Edit
---

# Add AI Chat Feature

Create an AI chat feature using Claude via the \`/api/llm\` endpoint.

## Steps

1. Create a custom hook \`hooks/useAIChat.ts\`:

\`\`\`typescript
import { useState } from 'react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const useAIChat = () => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (userMessage: string, systemPrompt?: string) => {
    setLoading(true);
    setError(null);

    try {
      const messages: Message[] = [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: userMessage }
      ];

      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
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

2. Create a chat screen or component that uses the hook
3. Ensure ANTHROPIC_API_KEY is in your .env file

## Environment

Required: \`ANTHROPIC_API_KEY\` in \`.env\`
`

  await fs.writeFile(path.join(commandsDir, 'ai-chat.md'), content, 'utf-8')
}

async function generateImageGenCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Add AI image generation feature using DALL-E 3
allowed-tools: Write, Read, Glob, Edit
---

# Add Image Generation Feature

Create an AI image generation feature using DALL-E 3 via the \`/api/images\` endpoint.

## Steps

1. Create a custom hook \`hooks/useImageGeneration.ts\`:

\`\`\`typescript
import { useState } from 'react';

interface GeneratedImage {
  uri: string;
  size: string;
}

export const useImageGeneration = () => {
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = async (prompt: string, size = '1024x1024') => {
    if (!prompt.trim()) {
      setError('Please provide a prompt');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size })
      });

      if (!res.ok) throw new Error('Failed to generate image');

      const data = await res.json();
      const uri = \`data:\${data.image.mimeType};base64,\${data.image.base64Data}\`;

      const result = { uri, size: data.size };
      setImage(result);
      return result;
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

2. Create an image generator screen using the hook
3. Use expo-image or React Native's Image component to display results
4. Ensure OPENAI_API_KEY is in your .env file

## Environment

Required: \`OPENAI_API_KEY\` in \`.env\`
`

  await fs.writeFile(path.join(commandsDir, 'image-gen.md'), content, 'utf-8')
}

async function generateSpeechToTextCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Add speech-to-text feature using Whisper
allowed-tools: Write, Read, Glob, Edit
---

# Add Speech to Text Feature

Create a voice input feature using Whisper via the \`/api/stt\` endpoint.

## Steps

1. Install expo-av if not already installed:
   \`npx expo install expo-av\`

2. Create a custom hook \`hooks/useSpeechToText.ts\`:

\`\`\`typescript
import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export const useSpeechToText = () => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Microphone permission denied');

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: { extension: '.m4a', outputFormat: 2, audioEncoder: 3, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
        ios: { extension: '.wav', outputFormat: 0, audioQuality: 127, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
        web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
      });
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return '';

    setLoading(true);
    setIsRecording(false);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      if (!uri) throw new Error('No recording URI');

      const formData = new FormData();
      const ext = uri.split('.').pop() || 'wav';
      formData.append('audio', { uri, name: \`recording.\${ext}\`, type: \`audio/\${ext}\` } as any);

      const res = await fetch('/api/stt', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Transcription failed');

      const data = await res.json();
      setTranscript(data.text);
      return data.text;
    } catch (err: any) {
      setError(err.message);
      return '';
    } finally {
      setLoading(false);
      recordingRef.current = null;
    }
  }, []);

  return { transcript, isRecording, loading, error, startRecording, stopRecording };
};
\`\`\`

3. Create a voice input component using the hook
4. Ensure OPENAI_API_KEY is in your .env file

## Environment

Required: \`OPENAI_API_KEY\` in \`.env\`
`

  await fs.writeFile(path.join(commandsDir, 'speech-to-text.md'), content, 'utf-8')
}

async function generateSearchCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Add Google search feature using SerpAPI
allowed-tools: Write, Read, Glob, Edit
---

# Add Google Search Feature

Create a web search feature using SerpAPI via the \`/api/search\` endpoint.

## Steps

1. Create a custom hook \`hooks/useGoogleSearch.ts\`:

\`\`\`typescript
import { useState, useCallback } from 'react';

interface SearchResult {
  position: number;
  title: string;
  link: string;
  displayed_link: string;
  snippet: string;
}

export const useGoogleSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, num: 10 })
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data.organicResults || []);
      return data.organicResults;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
};
\`\`\`

2. Create a search screen using the hook
3. Use Linking.openURL to open search results
4. Ensure SERP_API_KEY is in your .env file

## Environment

Required: \`SERP_API_KEY\` in \`.env\`
`

  await fs.writeFile(path.join(commandsDir, 'search.md'), content, 'utf-8')
}

async function generatePeopleSearchCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Add people search feature using Exa
allowed-tools: Write, Read, Glob, Edit
---

# Add People Search Feature

Create a people search feature using Exa via the \`/api/exa-search\` endpoint.

## Steps

1. Create a custom hook \`hooks/useExaPeopleSearch.ts\`:

\`\`\`typescript
import { useState, useCallback } from 'react';

interface SearchResult {
  title: string;
  url: string;
  score?: number;
  id: string;
}

export const useExaPeopleSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, numResults = 10) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/exa-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, numResults })
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data.results || []);
      return data.results;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
};
\`\`\`

2. Create a people search screen using the hook
3. Example queries: "VP of product at Figma", "Senior engineer at Google"
4. Ensure EXA_API_KEY is in your .env file

## Environment

Required: \`EXA_API_KEY\` in \`.env\`
`

  await fs.writeFile(path.join(commandsDir, 'people-search.md'), content, 'utf-8')
}

async function generateBuildCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Build and preview the app
allowed-tools: Bash(npx expo:*), Bash(npm:*), Read, Glob
---

# Build and Preview

Check for errors and build the app.

1. Check TypeScript: \`npx tsc --noEmit\`
2. Run linter: \`npx expo lint\`
3. Start dev server: \`npx expo start\`
4. Fix any errors before proceeding
`

  await fs.writeFile(path.join(commandsDir, 'build.md'), content, 'utf-8')
}

async function generateComponentCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Create a new React Native component
argument-hint: <ComponentName>
allowed-tools: Write, Read, Glob
---

# Create Component: $ARGUMENTS

Create \`components/$ARGUMENTS.tsx\` with:
- TypeScript interface for props
- Functional component with StyleSheet
- Named export

Template:
\`\`\`typescript
import { View, Text, StyleSheet } from 'react-native';

interface $ARGUMENTSProps {
  // props
}

export function $ARGUMENTS({ }: $ARGUMENTSProps) {
  return (
    <View style={styles.container}>
      <Text>$ARGUMENTS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
\`\`\`
`

  await fs.writeFile(path.join(commandsDir, 'component.md'), content, 'utf-8')
}

async function generateScreenCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Create a new screen/route
argument-hint: <screen-name>
allowed-tools: Write, Read, Glob, Edit
---

# Create Screen: $ARGUMENTS

Create a new screen in \`app/\` with Stack.Screen options.

Template:
\`\`\`typescript
import { View, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function $ARGUMENTSScreen() {
  return (
    <View style={styles.wrapper}>
      <Stack.Screen options={{ title: '$ARGUMENTS' }} />
      <ScrollView style={styles.container}>
        {/* Content */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 16 },
});
\`\`\`
`

  await fs.writeFile(path.join(commandsDir, 'screen.md'), content, 'utf-8')
}

async function generateFixCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Fix TypeScript and lint errors
allowed-tools: Bash(npx:*), Read, Edit, Glob, Grep
---

# Fix Errors

1. Run \`npx tsc --noEmit 2>&1\`
2. Run \`npx expo lint 2>&1\`
3. Fix each error by reading file, understanding context, applying fix
4. Re-run checks to verify
`

  await fs.writeFile(path.join(commandsDir, 'fix.md'), content, 'utf-8')
}

async function generateConvexCommand(commandsDir: string): Promise<void> {
  const content = `---
description: Create Convex functions
argument-hint: <function-name> [query|mutation|action]
allowed-tools: Write, Read, Glob, Edit, Bash(npx convex:*)
---

# Create Convex Function: $ARGUMENTS

Create a Convex function in \`convex/\` directory.

Templates:

Query:
\`\`\`typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const $1 = query({
  args: {},
  handler: async (ctx) => ctx.db.query("tableName").collect(),
});
\`\`\`

Mutation:
\`\`\`typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const $1 = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => ctx.db.insert("tableName", args),
});
\`\`\`

Rules:
- Always include validators
- Never name index "by_id" or "by_creation_time"
- Update schema.ts for new tables
`

  await fs.writeFile(path.join(commandsDir, 'convex.md'), content, 'utf-8')
}
