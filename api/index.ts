import express from "express";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Initialize routes lazily on first request
let routesInitialized = false;
let initPromise: Promise<void> | null = null;

const initializeRoutes = async () => {
  if (routesInitialized) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      // Import and register routes dynamically
      const { registerRoutes } = await import("../server/routes");
      await registerRoutes(app);
      routesInitialized = true;
      console.log('Routes initialized successfully');
    } catch (error) {
      console.error('Failed to initialize routes:', error);
      throw error;
    }
  })();
  
  return initPromise;
};

// Middleware to ensure routes are initialized before handling requests
app.use(async (req, res, next) => {
  try {
    await initializeRoutes();
    next();
  } catch (error) {
    console.error('Server initialization error:', error);
    res.status(500).json({ 
      message: 'Server initialization error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Catch all for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

export default app;