import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

// Les pages reçoivent leur CSP (avec nonce) de src/proxy.ts ; les routes API ne servent que du JSON et des fichiers.
const apiContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isDevelopment ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }])
        ]
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Content-Security-Policy", value: apiContentSecurityPolicy }]
      }
    ];
  }
};

export default nextConfig;
