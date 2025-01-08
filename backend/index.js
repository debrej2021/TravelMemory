const express = require('express');
const cors = require('cors');
require('dotenv').config();
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 5000; // Fallback to port 5000 if not defined in .env
const conn = require('./conn');

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // React app
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Initialize Prometheus metrics
const register = new client.Registry();

// Default metrics collection
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
});

const httpRequestCount = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCount);

// Middleware for tracking metrics
app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer({ method: req.method, route: req.route?.path || 'unknown' });

    res.on('finish', () => {
        httpRequestCount.inc({ method: req.method, route: req.route?.path || 'unknown', status_code: res.statusCode });
        end({ status_code: res.statusCode });
    });

    next();
});

// Routes
const tripRoutes = require('./routes/trip.routes');
app.use('/trip', tripRoutes); // Example: http://localhost:5000/trip --> POST/GET/GET by ID

// Health check endpoint
app.get('/hello', (req, res) => {
    res.send('Hello World!');
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
})
