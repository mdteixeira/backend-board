import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import { Request, Response, NextFunction } from "express";

const httpServer = createServer();
export const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const PORT = 1298;
httpServer.listen(PORT, () => {
    console.log(`Socket server is running on http://localhost:${PORT}`);
});

const app = express();

app.get("/", (req, res) => {
    res.send("Socket server is running!");
});

// Express error-handling middleware
interface ErrorRequest extends Error {
    status?: number;
}

app.use((err: ErrorRequest, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
});
