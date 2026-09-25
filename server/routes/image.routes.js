import { Router } from "express";
import { generateImageController } from "../controllers/image.controller.js";

export const imageRouter = Router();

imageRouter.post(
  "/generate",
  generateImageController
);
