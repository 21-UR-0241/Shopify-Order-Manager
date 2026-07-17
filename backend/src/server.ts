import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/database';
import authRoutes from './routes/auth.routes';
import storeRoutes from './routes/stores.routes';
import orderRoutes from './routes/orders.routes';
import userRoutes from './routes/users.routes';
import salesRoutes from './routes/sales.routes';

import shippingRoutes from './routes/shipping.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check with database ping
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      database: 'connected', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      error: (error as Error).message
    });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', shippingRoutes);
app.use('/api/sales', salesRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Keep database connection alive (ping every 5 minutes)
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('🏓 Database ping successful');
  } catch (error) {
    console.error('❌ Database ping failed:', error);
  }
}, 5 * 60 * 1000); // 5 minutes

// Start server
async function startServer() {
  try {
    // Test database connection with retry
    let connected = false;
    let retries = 3;
    
    while (!connected && retries > 0) {
      try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        connected = true;
        console.log('✅ Database connected');
      } catch (error) {
        retries--;
        console.log(`⚠️ Database connection failed. Retrying... (${retries} attempts left)`);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } else {
          throw error;
        }
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();

export default app;