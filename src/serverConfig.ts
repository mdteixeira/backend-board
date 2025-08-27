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

const PORT = process.env.PORT || 3000; // Use the PORT environment variable or default to 3000
httpServer.listen({ port: PORT, host: "0.0.0.0" }, () => {
    console.log(`Socket server is running on http://0.0.0.0:${PORT}`);
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
