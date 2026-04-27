/**
 * Service for extracting ticket information from images using OpenAI Vision API
 */

export interface ExtractedTicketData {
  origin_site?: string;
  destination_site?: string;
  net_weight?: number;
  product?: string;
  gross_weight?: number;
  tare_weight?: number;
  ticket_id?: string;
}

/**
 * Extract ticket information from an image using OpenAI Vision API
 * @param imageBase64 - Base64 encoded image data
 * @returns Extracted ticket data
 */
export async function extractTicketFromImage(
  imageBase64: string
): Promise<ExtractedTicketData> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this ticket image and extract the following information in JSON format:
                {
                  "origin_site": "pickup location name",
                  "destination_site": "delivery location name",
                  "net_weight": number (in tons),
                  "product": "product name or type",
                  "gross_weight": number (in tons),
                  "tare_weight": number (in tons),
                  "ticket_id": "ticket number if visible"
                }
                
                Only return valid JSON. If a field is not visible or cannot be determined, omit it from the response.
                For weights, convert to tons if they are in kg (divide by 1000).`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI API");
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from OpenAI response");
    }

    const extractedData = JSON.parse(jsonMatch[0]) as ExtractedTicketData;
    return extractedData;
  } catch (error) {
    console.error("Error extracting ticket data:", error);
    throw error;
  }
}

/**
 * Convert image file to base64 string
 * @param file - Image file
 * @returns Promise resolving to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

