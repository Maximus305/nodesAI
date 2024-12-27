import Anthropic from '@anthropic-ai/sdk';
import { StreamingTextResponse } from 'ai';
import { z } from 'zod';

// Environment validation
const requiredEnvVars = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
});

try {
  requiredEnvVars.parse(process.env);
} catch (error) {
  throw new Error('Missing required environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Message validation schema
const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
});

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Validate request body
    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: validatedData.maxTokens ?? 1024,
      temperature: validatedData.temperature ?? 0.7,
      messages: validatedData.messages.map(message => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
      })),
      stream: true,
    });

    // Transform the response into a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && 
                chunk.delta.type === 'text_delta') {
              
              const formattedChunk = {
                choices: [{
                  delta: {
                    content: chunk.delta.text,
                    role: 'assistant'
                  },
                  index: 0,
                  finish_reason: null
                }],
                id: `chatcmpl-${crypto.randomUUID()}`,
                model: 'claude-3-opus',
                object: 'chat.completion.chunk'
              };

              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify(formattedChunk)}\n\n`
              ));
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        status: error instanceof z.ZodError ? 400 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}