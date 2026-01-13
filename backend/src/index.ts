import 'reflect-metadata';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './config/database';
import { runMigrations } from './migrations/runMigrations';
import loanRoutes from './routes/loanRoutes';
import expenseRoutes from './routes/expenseRoutes';
import ratesRoutes from './routes/ratesRoutes';
import { etagMiddleware } from './utils/cacheMiddleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  // In production, log only errors
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
  }));
}

// Middleware
app.use(cors());
app.use(compression()); // Enable gzip compression for responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add ETag middleware for HTTP caching
app.use(etagMiddleware);

// Health check endpoint with detailed metrics
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)} minutes`,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    },
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes
app.use('/api/loans', loanRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/rates', ratesRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    await runMigrations();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
