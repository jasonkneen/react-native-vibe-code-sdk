import path from 'path'
import fs from 'fs-extra'

/**
 * Generate Expo API routes for the toolkit
 * These routes proxy to the external APIs (OpenAI, Anthropic, SerpAPI, Exa)
 * Users need to provide their own API keys via environment variables
 */
export async function generateApiRoutes(projectPath: string): Promise<void> {
  const apiDir = path.join(projectPath, 'app', 'api')
  await fs.ensureDir(apiDir)

  await generateLlmRoute(apiDir)
  await generateImagesRoute(apiDir)
  await generateSttRoute(apiDir)
  await generateSearchRoute(apiDir)
  await generateExaSearchRoute(apiDir)
}

async function generateLlmRoute(apiDir: string): Promise<void> {
  const routeDir = path.join(apiDir, 'llm+api')
  await fs.ensureDir(routeDir)

  const content = `import Anthropic from '@anthropic-ai/sdk';

/**
 * LLM API Route - AI Text Generation with Claude
 *
 * POST /api/llm
 * Body: { messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> }
 * Response: { completion: string }
 *
 * Required env: ANTHROPIC_API_KEY
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.messages || !Array.isArray(body.messages)) {
      return Response.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to your .env file.' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Extract system message if present
    const systemMessage = body.messages.find((m: any) => m.role === 'system');
    const otherMessages = body.messages.filter((m: any) => m.role !== 'system');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemMessage?.content || 'You are a helpful assistant.',
      messages: otherMessages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return Response.json({ completion: text });
  } catch (error: any) {
    console.error('[API LLM] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
`

  await fs.writeFile(path.join(routeDir, 'route.ts'), content, 'utf-8')
}

async function generateImagesRoute(apiDir: string): Promise<void> {
  const routeDir = path.join(apiDir, 'images+api')
  await fs.ensureDir(routeDir)

  const content = `/**
 * Image Generation API Route - DALL-E 3
 *
 * POST /api/images
 * Body: { prompt: string, size?: string }
 * Response: { image: { base64Data: string, mimeType: string }, size: string }
 *
 * Required env: OPENAI_API_KEY
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.prompt || typeof body.prompt !== 'string') {
      return Response.json(
        { error: 'Invalid request: prompt string is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'OPENAI_API_KEY not configured. Add it to your .env file.' },
        { status: 500 }
      );
    }

    const size = body.size || '1024x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: body.prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[API Images] OpenAI error:', error);
      return Response.json(
        { error: error?.error?.message || 'Image generation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const imageData = data.data[0];

    return Response.json({
      image: {
        base64Data: imageData.b64_json,
        mimeType: 'image/png',
      },
      size,
    });
  } catch (error: any) {
    console.error('[API Images] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
`

  await fs.writeFile(path.join(routeDir, 'route.ts'), content, 'utf-8')
}

async function generateSttRoute(apiDir: string): Promise<void> {
  const routeDir = path.join(apiDir, 'stt+api')
  await fs.ensureDir(routeDir)

  const content = `/**
 * Speech-to-Text API Route - OpenAI Whisper
 *
 * POST /api/stt
 * Body: FormData with 'audio' file and optional 'language' string
 * Response: { text: string, language: string }
 *
 * Required env: OPENAI_API_KEY
 * Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return Response.json(
        { error: 'Invalid request: audio file is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'OPENAI_API_KEY not configured. Add it to your .env file.' },
        { status: 500 }
      );
    }

    // Check file size (OpenAI has 25MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return Response.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    const language = formData.get('language');

    // Create form data for OpenAI Whisper API
    const openAIFormData = new FormData();
    openAIFormData.append('file', audioFile);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('response_format', 'json');

    if (language && typeof language === 'string') {
      openAIFormData.append('language', language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[API STT] OpenAI error:', error);
      return Response.json(
        { error: 'Failed to transcribe audio' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({
      text: data.text,
      language: data.language || 'en',
    });
  } catch (error: any) {
    console.error('[API STT] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
`

  await fs.writeFile(path.join(routeDir, 'route.ts'), content, 'utf-8')
}

async function generateSearchRoute(apiDir: string): Promise<void> {
  const routeDir = path.join(apiDir, 'search+api')
  await fs.ensureDir(routeDir)

  const content = `/**
 * Google Search API Route - SerpAPI
 *
 * POST /api/search
 * Body: { query: string, gl?: string, hl?: string, num?: number }
 * Response: { organicResults: [...], searchInformation: {...}, ... }
 *
 * Required env: SERP_API_KEY
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return Response.json(
        { error: 'Invalid request: query string is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'SERP_API_KEY not configured. Add it to your .env file.' },
        { status: 500 }
      );
    }

    // Build SerpAPI request URL
    const params = new URLSearchParams({
      api_key: apiKey,
      q: body.query,
      gl: body.gl || 'us',
      hl: body.hl || 'en',
      num: String(body.num || 10),
    });

    const response = await fetch(\`https://serpapi.com/search?\${params.toString()}\`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[API Search] SerpAPI error:', error);
      return Response.json(
        { error: error?.error || 'Search failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({
      searchMetadata: data.search_metadata,
      searchInformation: data.search_information,
      organicResults: data.organic_results || [],
      knowledgeGraph: data.knowledge_graph,
      relatedSearches: data.related_searches || [],
      localResults: data.local_results || [],
      shoppingResults: data.shopping_results || [],
    });
  } catch (error: any) {
    console.error('[API Search] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
`

  await fs.writeFile(path.join(routeDir, 'route.ts'), content, 'utf-8')
}

async function generateExaSearchRoute(apiDir: string): Promise<void> {
  const routeDir = path.join(apiDir, 'exa-search+api')
  await fs.ensureDir(routeDir)

  const content = `/**
 * Exa People Search API Route
 *
 * POST /api/exa-search
 * Body: { query: string, numResults?: number }
 * Response: { results: [...], requestId?: string }
 *
 * Required env: EXA_API_KEY
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return Response.json(
        { error: 'Invalid request: query string is required' },
        { status: 400 }
      );
    }

    const { query, numResults = 10 } = body;

    if (typeof numResults !== 'number' || numResults < 1 || numResults > 100) {
      return Response.json(
        { error: 'Invalid request: numResults must be between 1 and 100' },
        { status: 400 }
      );
    }

    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'EXA_API_KEY not configured. Add it to your .env file.' },
        { status: 500 }
      );
    }

    // Use Exa API directly
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: 'auto',
        category: 'people',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[API Exa] Error:', error);
      return Response.json(
        { error: error?.message || 'Search failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return Response.json({
      results: data.results,
      requestId: data.requestId,
    });
  } catch (error: any) {
    console.error('[API Exa] Error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
`

  await fs.writeFile(path.join(routeDir, 'route.ts'), content, 'utf-8')
}
