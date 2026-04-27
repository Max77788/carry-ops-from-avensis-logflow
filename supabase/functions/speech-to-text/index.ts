import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Enhanced CORS headers for HTTPS localhost and all origins
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept, origin, referer, user-agent",
  "Access-Control-Max-Age": "86400", // 24 hours
  "Access-Control-Allow-Credentials": "true",
};

interface SpeechToTextRequest {
  audioData: string; // Base64 encoded audio
  mimeType: string; // e.g., "audio/webm;codecs=opus", "audio/webm", "audio/mp4"
  language?: string; // Default to "en-US"
  sampleRate?: number; // Optional, will be detected or defaulted
}

/**
 * Speech-to-Text Edge Function
 * 
 * Uses Google Cloud Speech-to-Text API v1 to transcribe audio.
 * Requires GOOGLE_CLOUD_SPEECH_API_KEY environment variable.
 * 
 * API Documentation: https://cloud.google.com/speech-to-text/docs
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    const { audioData, mimeType, language = "en-US", sampleRate }: SpeechToTextRequest = await req.json();

    if (!audioData) {
      return new Response(
        JSON.stringify({ error: "audioData is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get("GOOGLE_CLOUD_SPEECH_API_KEY");
    
    if (!apiKey) {
      console.error("GOOGLE_CLOUD_SPEECH_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Speech-to-text service not configured",
          message: "Please configure GOOGLE_CLOUD_SPEECH_API_KEY in Supabase Edge Function secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine encoding and sample rate based on MIME type
    let encoding: string;
    let sampleRateHertz: number;

    if (mimeType.includes("webm") && mimeType.includes("opus")) {
      encoding = "WEBM_OPUS";
      // WEBM_OPUS supports: 8000, 12000, 16000, 24000, or 48000
      // Default to 48000 for web audio (common for MediaRecorder)
      sampleRateHertz = sampleRate && [8000, 12000, 16000, 24000, 48000].includes(sampleRate) 
        ? sampleRate 
        : 48000;
    } else if (mimeType.includes("webm")) {
      encoding = "WEBM_OPUS"; // Default to OPUS for WebM
      sampleRateHertz = sampleRate && [8000, 12000, 16000, 24000, 48000].includes(sampleRate)
        ? sampleRate
        : 48000;
    } else if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
      // MP4/M4A - use LINEAR16 if we can convert, or try MP3
      encoding = "MP3"; // MP3 is supported in v1p1beta1, but let's use WEBM_OPUS as fallback
      sampleRateHertz = sampleRate || 44100;
    } else {
      // Default to WEBM_OPUS for unknown types
      encoding = "WEBM_OPUS";
      sampleRateHertz = sampleRate && [8000, 12000, 16000, 24000, 48000].includes(sampleRate)
        ? sampleRate
        : 48000;
    }

    // Prepare request body for Google Cloud Speech-to-Text API v1
    // Endpoint: POST https://speech.googleapis.com/v1/speech:recognize?key=API_KEY
    const requestBody = {
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: language,
        enableAutomaticPunctuation: true,
        model: "latest_long", // Best for longer audio clips
        // Optional: enable word-level confidence
        // enableWordConfidence: true,
      },
      audio: {
        content: audioData, // Base64 encoded audio (already base64 from client)
      },
    };

    console.log("Sending request to Google Speech API", {
      encoding,
      sampleRateHertz,
      languageCode: language,
      audioDataLength: audioData.length,
    });

    // Call Google Cloud Speech-to-Text API v1
    const apiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Speech API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      let errorMessage = "Speech recognition failed";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }

      return new Response(
        JSON.stringify({ 
          error: "Speech recognition failed",
          details: errorMessage,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();

    console.log("Google Speech API response:", {
      hasResults: !!result.results,
      resultsCount: result.results?.length || 0,
    });

    // Extract transcript from response
    // Response format: { results: [{ alternatives: [{ transcript: "...", confidence: 0.xx }] }] }
    if (result.results && result.results.length > 0) {
      const transcripts: string[] = [];
      let totalConfidence = 0;
      let confidenceCount = 0;

      for (const speechResult of result.results) {
        if (speechResult.alternatives && speechResult.alternatives.length > 0) {
          const alternative = speechResult.alternatives[0];
          if (alternative.transcript) {
            transcripts.push(alternative.transcript);
            if (alternative.confidence !== undefined) {
              totalConfidence += alternative.confidence;
              confidenceCount++;
            }
          }
        }
      }

      const transcript = transcripts.join(" ").trim();
      const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

      if (transcript) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            transcript,
            confidence: averageConfidence,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // No speech detected
    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript: "",
        message: "No speech detected in audio",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in speech-to-text function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
