// ============================================================
// GGDC — Government Girls Degree College, Shahdadour — IP Detection Utility
// ============================================================

/**
 * Detects the user's public IP address using a free API
 * Falls back to localStorage-based tracking if API fails
 */
export async function detectIP(): Promise<string> {
  try {
    // Try multiple IP detection services for reliability
    const services = [
      'https://api.ipify.org?format=json',
      'https://api.ip.sb/ip',
      'https://ipapi.co/json/'
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, { 
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          // Different services return different formats
          const ip = data.ip || data.ipAddress || data.query;
          if (ip) {
            // Cache the IP in localStorage for faster subsequent access
            localStorage.setItem('user_ip', ip);
            localStorage.setItem('user_ip_timestamp', Date.now().toString());
            return ip;
          }
        }
      } catch (e) {
        // Try next service
        continue;
      }
    }

    // If all services fail, use cached IP or generate a fallback
    const cachedIP = localStorage.getItem('user_ip');
    if (cachedIP) {
      return cachedIP;
    }

    // Last resort: generate a pseudo-IP based on browser fingerprint
    const fallbackIP = generateFallbackID();
    localStorage.setItem('user_ip', fallbackIP);
    return fallbackIP;

  } catch (error) {
    console.error('IP detection failed:', error);
    // Return cached or fallback IP
    return localStorage.getItem('user_ip') || generateFallbackID();
  }
}

/**
 * Generates a unique fallback ID when IP detection fails
 * This is based on browser fingerprinting
 */
function generateFallbackID(): string {
  const nav = navigator;
  const screen = window.screen;
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.platform,
    nav.hardwareConcurrency || 'unknown'
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to IP-like format for consistency
  const hashStr = Math.abs(hash).toString();
  const parts = [
    hashStr.substring(0, 3) || '192',
    hashStr.substring(3, 6) || '168',
    hashStr.substring(6, 9) || '1',
    hashStr.substring(9, 12) || '100'
  ];

  return parts.map(p => parseInt(p) % 256).join('.');
}

/**
 * Gets cached IP if it's recent (within 24 hours)
 */
export function getCachedIP(): string | null {
  const cachedIP = localStorage.getItem('user_ip');
  const timestamp = localStorage.getItem('user_ip_timestamp');
  
  if (!cachedIP || !timestamp) return null;

  const age = Date.now() - parseInt(timestamp);
  const oneDay = 24 * 60 * 60 * 1000;

  return age < oneDay ? cachedIP : null;
}
