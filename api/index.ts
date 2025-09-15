// Vercel serverless function entry point
import handler from "../server/index";

// Add debugging information for Vercel deployments
console.log('Vercel API handler initialized:', {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV,
  runtime: process.env.VERCEL_REGION || 'local'
});

export default handler;