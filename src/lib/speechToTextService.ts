import { supabase } from "./supabase";

/**
 * Speech-to-Text Service
 * 
 * Uses MediaRecorder for mobile (records audio and sends to cloud service)
 * Uses Web Speech API for desktop (native browser support)
 */

interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

/**
 * Transcribe audio using Supabase Edge Function
 * This works on all platforms including mobile
 * 
 * @param audioBlob - The audio blob from MediaRecorder
 * @param mimeType - MIME type of the audio (e.g., "audio/webm;codecs=opus")
 * @param sampleRate - Optional sample rate in Hz (will be auto-detected if not provided)
 */
export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string = "audio/webm;codecs=opus",
  sampleRate?: number
): Promise<TranscriptionResult> {
  try {
    // Convert blob to base64
    // Use ArrayBuffer approach for better performance and reliability
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64 string
    // Using btoa with chunking for large files
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);

    // Get the Supabase project URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL not configured");
    }

    // Get the auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Call the Edge Function
    // Note: Since verify_jwt is false, we can call without auth, but include headers for compatibility
    const response = await fetch(
      `${supabaseUrl}/functions/v1/speech-to-text`,
      {
        method: "POST",
        mode: "cors", // Explicitly enable CORS
        credentials: "omit", // Don't send credentials to avoid CORS issues
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // Include auth headers for compatibility (even though verify_jwt is false)
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType,
          language: "en-US",
          sampleRate, // Optional, will be auto-detected
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Transcription failed");
    }

    return {
      success: true,
      transcript: result.transcript || "",
    };
  } catch (error: any) {
    console.error("Error transcribing audio:", error);
    return {
      success: false,
      error: error.message || "Failed to transcribe audio",
    };
  }
}

