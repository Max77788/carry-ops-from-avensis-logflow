/**
 * Ticket Processing Component using HTTP API (Method 4)
 * This component demonstrates how to call the process-tickets edge function
 * via direct HTTP requests without using the Supabase client library
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import {
  callTicketProcessingAPI,
  callTicketProcessingAPIWithTimeout,
  callTicketProcessingAPIWithRetry,
  type ProcessingResponse,
} from "@/lib/httpTicketProcessing";

export function TicketProcessingHTTP() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResponse | null>(null);
  const [method, setMethod] = useState<"basic" | "timeout" | "retry">("basic");

  const handleProcess = async () => {
    setLoading(true);
    setResult(null);

    try {
      let response: ProcessingResponse;

      switch (method) {
        case "timeout":
          response = await callTicketProcessingAPIWithTimeout(30000);
          break;
        case "retry":
          response = await callTicketProcessingAPIWithRetry(3, 1000);
          break;
        case "basic":
        default:
          response = await callTicketProcessingAPI();
      }

      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Processing (HTTP API)</CardTitle>
          <CardDescription>
            Call the process-tickets edge function via direct HTTP requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Method:</label>
            <div className="flex gap-2">
              <Button
                variant={method === "basic" ? "default" : "outline"}
                onClick={() => setMethod("basic")}
                disabled={loading}
              >
                Basic
              </Button>
              <Button
                variant={method === "timeout" ? "default" : "outline"}
                onClick={() => setMethod("timeout")}
                disabled={loading}
              >
                With Timeout
              </Button>
              <Button
                variant={method === "retry" ? "default" : "outline"}
                onClick={() => setMethod("retry")}
                disabled={loading}
              >
                With Retry
              </Button>
            </div>
          </div>

          {/* Process Button */}
          <Button
            onClick={handleProcess}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Processing..." : "Process Tickets Now"}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-2">
              {result.success ? (
                <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-900">Success!</h4>
                      {result.summary && (
                        <div className="text-sm text-green-800 space-y-1">
                          <p>Total Processed: {result.summary.total_processed}</p>
                          <p>Successful: {result.summary.successful}</p>
                          <p>Failed: {result.summary.failed}</p>
                          <p>Lookback Hours: {result.summary.lookback_hours}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-red-900">Error</h4>
                      <p className="text-sm text-red-800">{result.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              {result.results && result.results.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-sm">Detailed Results:</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {result.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-sm ${
                          r.success
                            ? "bg-green-100 text-green-900"
                            : "bg-red-100 text-red-900"
                        }`}
                      >
                        <p className="font-medium">{r.ticket_id}</p>
                        {r.success && r.extracted_data && (
                          <div className="text-xs mt-1">
                            <p>Gross Weight: {r.extracted_data.gross_weight}</p>
                            <p>Net Weight: {r.extracted_data.net_weight}</p>
                          </div>
                        )}
                        {r.error && <p className="text-xs mt-1">{r.error}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  View Raw JSON
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Basic Call:</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`import { callTicketProcessingAPI } from "@/lib/httpTicketProcessing";

const result = await callTicketProcessingAPI();
console.log(result);`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">With Timeout:</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`import { callTicketProcessingAPIWithTimeout } from "@/lib/httpTicketProcessing";

const result = await callTicketProcessingAPIWithTimeout(30000);
console.log(result);`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">With Retry:</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`import { callTicketProcessingAPIWithRetry } from "@/lib/httpTicketProcessing";

const result = await callTicketProcessingAPIWithRetry(3, 1000);
console.log(result);`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Raw Fetch:</h4>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
{`const response = await fetch(
  "https://your-project.supabase.co/functions/v1/process-tickets",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer your-anon-key",
      "Content-Type": "application/json",
    },
  }
);

const data = await response.json();
console.log(data);`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

