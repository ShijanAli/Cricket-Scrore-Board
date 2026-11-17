import { createApp } from '../src/app';

// Vercel serverless entry: an Express app is a plain (req, res) handler. No Socket.io here (see DEPLOY.md).
export default createApp();
