import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // Next's rewrites() type requires a Promise-returning function even though
  // this rewrite list is static; no await is needed here.
  // eslint-disable-next-line @typescript-eslint/require-await
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
