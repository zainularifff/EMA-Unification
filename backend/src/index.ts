import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || process.env.BACKEND_PORT || 3001);
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '25mb' }));
app.use(cookieParser());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ema-backend', time: new Date().toISOString() });
});
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ema-backend', time: new Date().toISOString() });
});

app.use('/api', routes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled backend error:', err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`EMA backend listening on port ${port}`);
});

export default app;
