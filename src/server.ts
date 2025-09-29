import { cardsMap } from './cardsMap';
import { io } from './serverConfig';

export const startServer = () =>
    io.on('connection', (socket) => {
        console.info(`User ${socket.id} connected`, {
            Trigger: 'user',
            Action: 'connect',
            socketId: socket.id,
            topic: 'connection',
        });

        socket.on('joinRoom', (room, user) => {
            try {
                if (!room || typeof room !== 'string')
                    throw new Error('Invalid room name');

                socket.join(room);
                console.info(`User ${user.name} joined room ${room}`, {
                    Trigger: 'room',
                    Action: 'join',
                    room,
                    user,
                    socketId: socket.id,
                    topic: 'joinRoom',
                });
                io.to(room).emit('room.join', user);

                if (!cardsMap.has(room)) {
                    cardsMap.set(room, []);
                    console.log(`Created new room: ${room}`);
                }

                const existingCards = cardsMap.get(room);
                if (existingCards?.length) {
                    socket.emit('cards.initial', existingCards);
                    console.info(`Sent initial cards of room ${room} to ${socket.id}`, {
                        Trigger: 'cards',
                        Action: 'initial',
                        room,
                        socketId: socket.id,
                        cards: existingCards,
                        topic: 'joinRoom',
                    });
                }
            } catch (error) {
                console.error(`Error in joinRoom`, { error, topic: 'joinRoom' });
                socket.emit('error', 'Failed to join room');
            }
        });

        socket.on('leaveRoom', (room) => {
            try {
                io.to(room).emit('room.leave', `User ${socket.id} has left the room`);
                socket.leave(room);
                console.info(`User ${socket.id} left room: ${room}`, {
                    Trigger: 'room',
                    Action: 'leave',
                    room,
                    socketId: socket.id,
                    topic: 'leaveRoom',
                });
            } catch (error) {
                console.error(`Error in leaveRoom`, { error, topic: 'leaveRoom' });
                socket.emit('error', 'Failed to leave room');
            }
        });

        socket.on('card.add', (room, card) => {
            try {
                if (
                    !room ||
                    typeof room !== 'string' ||
                    !card ||
                    typeof card !== 'object'
                ) {
                    throw new Error('Invalid room or card data');
                }

                io.to(room).emit('card.added', card);
                console.log(`Card added in room`, {
                    topic: 'card.add',
                    card,
                    room,
                });

                const cards = cardsMap.get(room) || [];
                cards.push(card);
                cardsMap.set(room, cards);
            } catch (error) {
                console.error(`Error in card.add`, { error, topic: 'card.add' });
                socket.emit('error', 'Failed to add card');
            }
        });

        socket.on('card.update', (room, cardId, card) => {
            try {
                if (!room || typeof room !== 'string' || !cardId || !card) {
                    throw new Error('Invalid room, cardId, or card data');
                }

                io.to(room).emit('card.updated', cardId, card);
                console.log(`Card updated in room ${room}:`, {
                    room,
                    cardId,
                    card,
                    topic: 'card.update',
                });

                const cards = cardsMap.get(room) || [];
                const cardIndex = cards.findIndex((card) => card.id === cardId);
                if (cardIndex !== -1) {
                    cards[cardIndex] = card;
                    cardsMap.set(room, cards);
                } else {
                    console.warn(`Card with ID ${cardId} not found in room ${room}`, {
                        cardId,
                        room,
                        topic: 'card.updated',
                    });
                }
            } catch (error) {
                console.error(`Error in card.update: ${error}`);
                socket.emit('error', 'Failed to update card');
            }
        });

        socket.on('card.remove', (room, cardId) => {
            try {
                if (!room || typeof room !== 'string' || !cardId) {
                    throw new Error('Invalid room or cardId');
                }

                io.to(room).emit('card.removed', cardId);
                console.log(`Card removed in room ${room}:`, cardId);

                const cards = cardsMap.get(room) || [];
                const updatedCards = cards.filter((card) => card.id !== cardId);
                cardsMap.set(room, updatedCards);
                console.log(`Updated cards for room ${room}:`, updatedCards);
            } catch (error) {
                console.error(`Error in card.remove: ${error}`);
                socket.emit('error', 'Failed to remove card');
            }
        });

        socket.on('column.update', (room, column, updatedColumn) => {
            try {
                const cards = cardsMap.get(room) || [];
                const updatedCards = cards.map((card) => {
                    if (card.column === column.column) {
                        return { ...card, column };
                    }
                    return card;
                });
                cardsMap.set(room, updatedCards);
                io.to(room).emit('column.updated', column, updatedColumn);
                console.log(`Column updated in room ${room}:`, column, updatedColumn);
            } catch (error) {
                console.error(`Error in column.update: ${error}`);
                socket.emit('error', 'Failed to update column');
            }
        });
        socket.on('column.delete', (room, column) => {
            try {
                const cards = cardsMap.get(room) || [];
                const updatedCards = cards.map((card) => {
                    if (card.column === column.column) {
                        return { ...card, column };
                    }
                    return card;
                });

                cardsMap.set(room, updatedCards);
                io.to(room).emit('column.deleted', column);
                console.log(`Column deleted in room ${room}:`, column);
            } catch (error) {
                console.error(`Error in column.delete: ${error}`);
                socket.emit('error', 'Failed to delete column');
            }
        });

        socket.on('user.update', (room, user) => {
            try {
                if (
                    !room ||
                    typeof room !== 'string' ||
                    !user ||
                    typeof user !== 'object'
                ) {
                    throw new Error('Invalid room or user data');
                }

                console.log('user', user);

                io.to(room).emit('user.updated', user);

                const cards = cardsMap.get(room) || [];
                const userCards = cards.filter((card) => card.user.name === user.name);
                if (userCards.length > 0) {
                    userCards.forEach((userCard) => {
                        userCard.user = user;
                    });
                } else {
                    console.warn(`User ${user.name} not found in room ${room}`);
                }

                console.log(`User updated in room ${room}:`, user);
            } catch (error) {
                console.error(`Error in user.update: ${error}`);
                socket.emit('error', 'Failed to update user');
            }
        });

        socket.on('timer.open', (room, open) => {
            try {
                if (!room || typeof room !== 'string') throw new Error('Invalid room');
                io.to(room).emit('timer.open', open);
            } catch (error) {
                console.error(`Error in timer: ${error}`);
                socket.emit('error', 'Failed to update timer');
            }
        });

        socket.on('hide.users', (room, hide) => {
            try {
                if (!room || typeof room !== 'string') throw new Error('Invalid room');
                io.to(room).emit('hide.users', hide);
            } catch (error) {
                console.error(`Error in hide users: ${error}`);
                socket.emit('error', 'Failed to hide users');
            }
        });

        socket.on('filter.users', (room, filter) => {
            try {
                if (!room || typeof room !== 'string') throw new Error('Invalid room');
                io.to(room).emit('filter.users', filter);
            } catch (error) {
                console.error(`Error in filter users: ${error}`);
                socket.emit('error', 'Failed to filter users');
            }
        });

        socket.on('timer.update', (room, totalSecond, isRunning) => {
            try {
                if (!room || typeof room !== 'string') throw new Error('Invalid room');
                io.to(room).emit('timer.updated', totalSecond, isRunning);
            } catch (error) {
                console.error(`Error in timer: ${error}`);
                socket.emit('error', 'Failed to update timer');
            }
        });

        socket.on('presentation.update', (room, data) => {
            try {
                if (!room || typeof room !== 'string') throw new Error('Invalid room');
                io.to(room).emit('presentation.status', data);
            } catch (error) {
                console.error(`Error in presentation update: ${error}`);
                socket.emit('error', 'Failed to update presentation');
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);

            // Optionally handle cleanup if necessary
            io.emit('user.disconnected', `User ${socket.id} has disconnected`);
            // If you want to remove the user from all rooms
            socket.rooms.forEach((room) => {
                if (room !== socket.id) {
                    // Avoid removing from the socket"s own room
                    console.log(`User ${socket.id} left room: ${room}`, {
                        topic: 'disconnect',
                        user: socket.id,
                        room,
                    });
                    socket.leave(room);
                }
            });
            console.log(`User ${socket.id} has disconnected and left all rooms`);
        });
    });
