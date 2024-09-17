// Required modules
const WebSocket = require('ws');
const fs = require('fs');
const express = require('express');
const path = require('path');


// Create an Express app to serve the files
const app = express();
const port = process.env.PORT || 3000; // Heroku sets PORT as an environment variable


// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));


// Create WebSocket server
const server = app.listen(port, () => {
    console.log(`HTTP server running on http://localhost:${port}`);
});


// WebSocket server on the same port as HTTP server
const wss = new WebSocket.Server({ server });
console.log(`WebSocket server running on ws://localhost:${port}`);


// Define paths for text files
const errorLogPath = 'errors.txt';
const interactionLogPath = 'interactions.txt';


// Ensure text files exist
if (!fs.existsSync(errorLogPath)) fs.writeFileSync(errorLogPath, '');
if (!fs.existsSync(interactionLogPath)) fs.writeFileSync(interactionLogPath, '');


// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;  // Mark the connection as alive when pong is received
    });

    // Handle messages from clients
    ws.on('message', (message) => {
        try {
            const event = JSON.parse(message);

            // Handle interaction and error events
            switch (event.type) {
                case 'event.interaction':
                    console.log(`Interaction: ${event.data}`);
                    logToFile(interactionLogPath, event.data);  // Write to interactions.txt
                    ws.send('Interaction logged.');
                    break;

                case 'event.error':
                    console.log(`Error: ${event.data}`);
                    logToFile(errorLogPath, event.data);  // Write to errors.txt
                    ws.send('Error logged.');
                    break;

                default:
                    console.log('Unknown event type received.');
            }
        } catch (error) {
            console.log('Invalid message received.');
        }
    });

    const interval = setInterval(() => {
        wss.clients.forEach((client) => {
            if (!client.isAlive) {
                return client.terminate();
            }
            client.isAlive = false;
            client.ping();  // Send ping to client
        });
    }, 30000);

    // Handle WebSocket connection close
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});


// Helper function to log data to a file
function logToFile(filePath, data) {
    fs.appendFile(filePath, `${data}\n`, (err) => {
        if (err) throw err;
    });
}


// Serve errors.txt over HTTP
app.get('/errors.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'errors.txt'));
});


// Serve interactions.txt over HTTP
app.get('/interactions.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'interactions.txt'));
});
