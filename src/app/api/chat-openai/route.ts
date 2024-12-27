// app/api/chat/route.ts
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(req: Request) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse the request body
    const { messages } = await req.json();

    // Validate the messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid messages format' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Request the OpenAI API for the response
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(req: Request) {
  return new NextResponse(null, { headers: corsHeaders });
}

// Types
export type Message = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: Date;
};

export type ChatRequest = {
  messages: Message[];
};

export type ChatResponse = {
  message: Message;
};