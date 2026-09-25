import { Router } from "express";
import { titleController } from "../controllers/title.controller.js";

export const titleRouter = Router();
titleRouter.post("/", titleController);
