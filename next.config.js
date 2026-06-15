/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone",
  env: {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || "",
  },
}
module.exports = nextConfig
