// Supabase Edge Function to get client IP address
// Deploy with: supabase functions deploy get-client-ip

// @ts-ignore: Deno module
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-customer-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const headers = req.headers;
    const ip = headers.get("cf-connecting-ip") || 
               headers.get("x-real-ip") || 
               headers.get("x-forwarded-for")?.split(",")[0].trim() || 
               "127.0.0.1";

    return new Response(
      JSON.stringify({ ip, timestamp: new Date().toISOString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

