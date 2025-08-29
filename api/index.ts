import express from "express";
import { registerRoutes } from "../server/routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registrar rotas
await registerRoutes(app);

export default app;