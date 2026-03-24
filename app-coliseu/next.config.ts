import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/admin", destination: "/admin/index.html" },
      { source: "/admin/:path*", destination: "/admin/:path*" },
      { source: "/checkin", destination: "/checkin/index.html" },
      { source: "/checkin/:path*", destination: "/checkin/:path*" },
      { source: "/av-fisica", destination: "/av-fisica/index.html" },
      { source: "/av-fisica/:path*", destination: "/av-fisica/:path*" },
      { source: "/", destination: "/research-page/index.html" },
      // O root "/" continua sendo tratado pelo App Router (src/app/page.tsx)
      // Se necessário, podemos redirecionar o "/" para o /research-page
    ];
  },
};

export default nextConfig;
