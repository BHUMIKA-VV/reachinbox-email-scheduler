import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import emailRoutes from "./routes/emails";
import { authGoogle, authGoogleCallback } from "./auth";
import senderRoutes from "./routes/senders";

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3001",
    credentials: true
  })
);

app.get("/auth/google", authGoogle);
app.get("/auth/google/callback", authGoogleCallback);
app.use("/emails", emailRoutes);
app.use("/senders", senderRoutes);

const port = Number(process.env.PORT ?? 3000);
app.listen(port);
