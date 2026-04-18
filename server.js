import express from "express";
import cors from "cors";
import handler from "./api/ask.js";

const app = express();
app.use(cors());
app.use(express.json());
app.post("/api/ask", handler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
