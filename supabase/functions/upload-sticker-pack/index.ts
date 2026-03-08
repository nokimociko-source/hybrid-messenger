// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Validation constants matching StickerValidator
const MAX_FILE_SIZE = 512 * 1024 // 512KB
const ALLOWED_FORMATS = ['image/webp', 'image/png']
const MAX_STICKERS_PER_PACK = 50

interface ValidationError {
  field: string
  message: string
}

interface UploadStickerPackRequest {
  name: string
  author: string
  files: Array<{
    name: string
    data: string // base64 encoded
    type: string
  }>
}

/**
 * Validates a single sticker file
 */
function validateFile(file: { name: string; data: string; type: string }, index: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Check file format
  if (!ALLOWED_FORMATS.includes(file.type)) {
    errors.push({
      field: `file_${index}_format`,
      message: `File "${file.name}": Invalid format. Allowed: ${ALLOWED_FORMATS.join(', ')}. Got: ${file.type}`,
    })
  }

  // Decode base64 to check size
  try {
    const base64Data = file.data.split(',')[1] || file.data
    const binaryString = atob(base64Data)
    const fileSize = binaryString.length

    if (fileSize > MAX_FILE_SIZE) {
      errors.push({
        field: `file_${index}_size`,
        message: `File "${file.name}": Size exceeds ${MAX_FILE_SIZE / 1024}KB. Got: ${Math.round(fileSize / 1024)}KB`,
      })
    }
  } catch (error) {
    errors.push({
      field: `file_${index}_data`,
      message: `File "${file.name}": Invalid base64 data`,
    })
  }

  return errors
}

/**
 * Validates the entire sticker pack
 */
function validatePack(request: UploadStickerPackRequest): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // Check pack name
  if (!request.name || request.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Pack name is required',
    })
  } else if (request.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Pack name must be 100 characters or less',
    })
  }

  // Check author
  if (!request.author || request.author.trim().length === 0) {
    errors.push({
      field: 'author',
      message: 'Pack author is required',
    })
  }

  // Check number of stickers
  if (!request.files || request.files.length === 0) {
    errors.push({
      field: 'files',
      message: 'At least one sticker is required',
    })
  } else if (request.files.length > MAX_STICKERS_PER_PACK) {
    errors.push({
      field: 'files',
      message: `Maximum ${MAX_STICKERS_PER_PACK} stickers per pack. Got: ${request.files.length}`,
    })
  }

  // Validate each file
  if (request.files) {
    request.files.forEach((file, index) => {
      const fileErrors = validateFile(file, index)
      errors.push(...fileErrors)
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const request: UploadStickerPackRequest = await req.json()

    // Validate pack
    const validation = validatePack(request)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create sticker pack record
    const { data: pack, error: packError } = await supabase
      .from('sticker_packs')
      .insert({
        name: request.name,
        author: request.author,
        preview_url: '', // Will be updated after uploading first sticker
      })
      .select()
      .single()

    if (packError || !pack) {
      return new Response(
        JSON.stringify({ error: 'Failed to create sticker pack', details: packError?.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const packId = pack.id
    const stickerIds: string[] = []
    let previewUrl = ''

    // Upload each sticker file
    for (let i = 0; i < request.files.length; i++) {
      const file = request.files[i]
      
      // Decode base64 data
      const base64Data = file.data.split(',')[1] || file.data
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j)
      }

      // Determine file extension
      const extension = file.type === 'image/webp' ? 'webp' : 'png'
      const stickerId = crypto.randomUUID()
      const filePath = `stickers/${packId}/${stickerId}.${extension}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(filePath, bytes, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        // Clean up: delete pack if upload fails
        await supabase.from('sticker_packs').delete().eq('id', packId)
        return new Response(
          JSON.stringify({ error: 'Failed to upload sticker', details: uploadError.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('stickers')
        .getPublicUrl(filePath)

      const imageUrl = urlData.publicUrl

      // Use first sticker as preview
      if (i === 0) {
        previewUrl = imageUrl
      }

      // Create sticker record
      const { data: sticker, error: stickerError } = await supabase
        .from('stickers')
        .insert({
          pack_id: packId,
          image_url: imageUrl,
          emoji_shortcode: null,
          order_index: i,
        })
        .select()
        .single()

      if (stickerError || !sticker) {
        // Clean up: delete pack if sticker creation fails
        await supabase.from('sticker_packs').delete().eq('id', packId)
        return new Response(
          JSON.stringify({ error: 'Failed to create sticker record', details: stickerError?.message }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      stickerIds.push(sticker.id)
    }

    // Update pack with preview URL
    const { error: updateError } = await supabase
      .from('sticker_packs')
      .update({ preview_url: previewUrl })
      .eq('id', packId)

    if (updateError) {
      console.error('Failed to update preview URL:', updateError)
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({
        packId,
        stickerIds,
        previewUrl,
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
