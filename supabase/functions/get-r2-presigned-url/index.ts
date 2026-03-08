// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.341.0'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.341.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { fileName, fileType } = await req.json()
        if (!fileName) {
            return new Response(JSON.stringify({ error: 'fileName is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: Deno.env.get('R2_ENDPOINT'),
            credentials: {
                accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
                secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
            },
        })

        const bucketName = Deno.env.get('R2_BUCKET_NAME') ?? 'media'
        const key = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType || 'application/octet-stream',
        })

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

        // Cloudflare R2 public URL pattern: https://<pub-hash>.r2.dev/<key> 
        // or custom domain https://cdn.example.com/<key>
        // We expect the user to set R2_PUBLIC_URL_BASE
        const publicUrlBase = Deno.env.get('R2_PUBLIC_URL_BASE')
        const publicUrl = publicUrlBase ? `${publicUrlBase}/${key}` : uploadUrl.split('?')[0]

        return new Response(
            JSON.stringify({ uploadUrl, publicUrl, key }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
