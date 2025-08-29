import express from "express";
import { registerRoutes } from "../server/routes.js";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register all routes
await registerRoutes(app);

export default app;