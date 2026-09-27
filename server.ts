import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth.js';
import { knowledgeBasesRouter } from './server/routes/knowledgeBases.js';
import { documentsRouter } from './server/routes/documents.js';
import { chatRouter } from './server/routes/chat.js';
import { settingsRouter } from './server/routes/settings.js';
import { db } from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging (sanitized, no passwords or tokens)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/@') && !req.url.startsWith('/node_modules') && !req.url.startsWith('/src')) {
      console.log(`[HTTP] ${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint (Requirements 11 & 15)
const handleHealth = async (_req: express.Request, res: express.Response) => {
  const settings = db.getSettings();
  const dbHealth = await db.checkHealth();
  const isAiConfigured = Boolean(settings.hf_token && settings.hf_token.trim().length > 0 && !settings.hf_token.startsWith('hf_your_'));

  const isHealthy = dbHealth.connected;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'Nexora API',
    product: 'Nexora — AI Knowledge & RAG Platform',
    timestamp: new Date().toISOString(),
    database: {
      status: dbHealth.status,
      type: dbHealth.database,
      details: dbHealth.details,
    },
    ai_provider: {
      provider: settings.ai_provider,
      configured: isAiConfigured,
      generation_model: settings.hf_model,
      embedding_model: settings.hf_embedding_model,
      status: isAiConfigured ? 'ready' : 'missing_token (configure HF_TOKEN in Settings)',
    },
  });
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// Mount API routers
app.use('/api/auth', authRouter);
app.use('/api/knowledge-bases', knowledgeBasesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/settings', settingsRouter);

// Global API error handler
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Nexora] Vite middleware mounted for development.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Nexora] Serving static production build from dist/.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Nexora Server running at http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
    console.log(`🤖 AI Provider: ${db.getSettings().ai_provider}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
