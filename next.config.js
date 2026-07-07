const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/calendar.ics",
        destination: "/api/calendar",
      },
    ];
  },
}
module.exports = nextConfig
