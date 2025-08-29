import express from "express";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize routes lazily on first request
let routesInitialized = false;
let initPromise: Promise<void> | null = null;

const initializeRoutes = async () => {
  if (routesInitialized) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      // Import and register routes dynamically
      const { registerRoutes } = await import("../server/routes.js");
      await registerRoutes(app);
      routesInitialized = true;
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default app;