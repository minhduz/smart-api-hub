import 'dotenv/config';
import express from 'express';
import { db } from './db/knex';
import {runMigration} from './db/migrate'
import cors from 'cors';

// Router import
import authRouter from './routes/auth.route'
import resourceRouter from './routes/resource.route'
import { globalErrorHandler } from './middlewares/globalErrorHandler';
import { rateLimiter } from './middlewares/rateLimiter';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();
app.use(express.json());
app.use(cors());

app.use(rateLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({ message: 'pg-json-server is running! 🚀' });
});

app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'ok',
      uptime: process.uptime(),
      database: 'disconnected',
    });
  }
});
// custom route
app.use('/auth', authRouter);
app.use('/', resourceRouter);

app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async() => {
  await runMigration();
  console.log(`Server is running at http://localhost:${PORT}`);
});

