import 'reflect-metadata';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { initializeDatabase } from './config/database';
import { runMigrations } from './migrations/runMigrations';
import loanRoutes from './routes/loanRoutes';
import expenseRoutes from './routes/expenseRoutes';
import { etagMiddleware } from './utils/cacheMiddleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(compression()); // Enable gzip compression for responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add ETag middleware for HTTP caching
app.use(etagMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/loans', loanRoutes);
app.use('/api/expenses', expenseRoutes);

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
