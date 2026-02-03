import express from "express";
import cors from "cors";
import matchRoutes from "./routes/matchRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", matchRoutes);

export default app;
