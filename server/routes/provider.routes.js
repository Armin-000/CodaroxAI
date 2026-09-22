import { Router } from "express";
import { openRouterStatusController } from "../controllers/provider.controller.js";

export const providerRouter = Router();
providerRouter.get("/openrouter/status", openRouterStatusController);
