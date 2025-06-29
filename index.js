import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const rooms = new Map();

io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on("joinRoom", (room) => {
        socket.join(room);
        if (!rooms.has(room)) {
            rooms.set(room, new Set());
        }
        rooms.get(room).add(socket.id);

        console.log(`User ${socket.id} joined room: ${room}`);
        io.to(room).emit("room.join", `User ${socket.id} has joined the room`);
    });

    socket.on("leaveRoom", (room) => {
        socket.leave(room);
        if (rooms.has(room)) {
            rooms.get(room).delete(socket.id);
            if (rooms.get(room).size === 0) {
                rooms.delete(room);
            }
        }
        io.to(room).emit("room.leave", `User ${socket.id} has left the room`);
        console.log(`User ${socket.id} left room: ${room}`);
    });

    socket.on("card.add", (room, card) => {
        io.to(room).emit("card.added", card);
        console.log(`Card added in room ${room}:`, card);
    });

    socket.on("card.update", (room, cardId, card) => {
        io.to(room).emit("card.updated", cardId, card);
        console.log(`Card updated in room ${room}:`, cardId);
    });

    socket.on("card.remove", (room, cardId) => {
        io.to(room).emit("card.removed", cardId);
        console.log(`Card removed in room ${room}:`, cardId);
    });

    socket.on("user.update", (room, user) => {
        io.to(room).emit("user.updated", user);
        console.log(`User updated in room ${room}:`, user);
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        rooms.forEach((members, room) => {
            if (members.has(socket.id)) {
                members.delete(socket.id);
                if (members.size === 0) {
                    rooms.delete(room);
                } else {
                    io.to(room).emit("room.leave", `User ${socket.id} has disconnected`);
                }
            }
        });
    });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Socket server is running on http://localhost:${PORT}`);
});
const app = express();

app.get("/", (req, res) => {
    res.send("Socket server is running!");
});
