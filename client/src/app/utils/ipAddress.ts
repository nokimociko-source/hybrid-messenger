/**
 * Client IP address detection utility
 * Used for rate limiting and security logging
 */

import { supabase } from '../../supabaseClient';
import { logger } from './logger';

let cachedIP: string | null = null;
let ipFetchPromise: Promise<string> | null = null;

/**
 * Get client IP address
 * Uses Supabase Edge Function to get real IP from headers
 */
export async function getClientIP(): Promise<string> {
  // Return cached IP if available
  if (cachedIP) {
    return cachedIP;
  }

  // Return existing promise if fetch is in progress
  if (ipFetchPromise) {
    return ipFetchPromise;
  }

  // Start new fetch
  ipFetchPromise = fetchClientIP();
  
  try {
    cachedIP = await ipFetchPromise;
    return cachedIP;
  } finally {
    ipFetchPromise = null;
  }
}

async function fetchClientIP(): Promise<string> {
  try {
    // Try to get IP from Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('get-client-ip', {
      method: 'GET',
    });

    if (error) {
      logger.warn('Failed to get client IP from edge function', error);
      return getFallbackIP();
    }

    if (data?.ip) {
      logger.debug('Client IP retrieved', { ip: data.ip });
      return data.ip;
    }

    return getFallbackIP();
  } catch (err) {
    logger.error('Error fetching client IP', err);
    return getFallbackIP();
  }
}

/**
 * Fallback IP detection methods
 */
function getFallbackIP(): string {
  // Try WebRTC (works in some browsers)
  // Note: This is less reliable and may not work in all browsers
  
  // For now, return a placeholder
  // In production, you should use a proper IP detection service
  return 'unknown';
}

/**
 * Clear cached IP (useful for testing or when network changes)
 */
export function clearIPCache() {
  cachedIP = null;
  ipFetchPromise = null;
}

/**
 * Get IP hash for privacy-preserving logging
 * Returns SHA-256 hash of IP address
 */
export async function getIPHash(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
