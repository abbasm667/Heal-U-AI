import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// We import these routes which we will create shortly
import chatRoutes from './src/routes/chat.js';
import doctorsRoutes from './src/routes/doctors.js';
import pharmacyRoutes from './src/routes/pharmacy.js';
import healthReportRoutes from './src/routes/health-report.js';

dotenv.config();

const __dirname = typeof __filename !== 'undefined'
  ? path.dirname(__filename)
  : path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/health-report', healthReportRoutes);

// Integration with Vite for Dev / Static Serving for Prod
async function startServer() {
  if (!isProd) {
    // Development mode: Use Vite's development server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built frontend static files
    app.use(express.static(path.resolve(__dirname, 'dist/client')));
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/client/index.html'));
    });
  }

  app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}  (accessible on all network interfaces)`);
  });
}

startServer();

// Global crash guards — prevent silent server deaths
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
});
