import type { NextConfig } from "next";

const securityHeaders = [
  // Disallow embedding in iframes (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send origin only on cross-origin requests, full URL same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Opt out of browser features this app never uses. geolocation is scoped
  // to same-origin (not fully disabled) — lib/useUserCountry.ts uses it to
  // detect the visitor's country for the Top Attractions carousel.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  // Force HTTPS for a year, including subdomains, once a browser has seen
  // this header once (safe no-op locally since dev runs over HTTP).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
