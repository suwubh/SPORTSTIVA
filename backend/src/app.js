import express from "express";
import cors from "cors";
import matchRoutes from "./routes/matchRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", matchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
