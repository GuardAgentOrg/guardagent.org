require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request logger
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API ${req.method}] ${req.path} - ${new Date().toISOString()}`);
  }
  next();
});

// API Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/audit-logs', require('./routes/audit'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/analytics', require('./routes/analytics'));

// Serve Static Frontend Assets
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Route Rewriter for Clean URLs without .html extension
const publicRoutes = ['features', 'how-it-works', 'security', 'docs', 'login', 'signup', 'quickstart'];
publicRoutes.forEach(route => {
  app.get(`/${route}`, (req, res) => {
    res.sendFile(path.join(publicDir, `${route}.html`));
  });
});

app.get('/docs/quickstart', (req, res) => {
  res.sendFile(path.join(publicDir, 'quickstart.html'));
});

const appRoutes = ['agents', 'policies', 'risk-analysis', 'approvals', 'audit-logs', 'alerts', 'settings'];
appRoutes.forEach(route => {
  app.get(`/app/${route}`, (req, res) => {
    res.sendFile(path.join(publicDir, 'app', `${route}.html`));
  });
});

// Fallback for /app
app.get('/app', (req, res) => {
  res.sendFile(path.join(publicDir, 'app', 'index.html'));
});

// Global 404 handler for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: "Endpoint Not Found", path: req.path });
});

// Fallback for root
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred."
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  GuardAgent — AI Agent Security Platform (Beta)`);
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  Public Website:   http://localhost:${PORT}/`);
  console.log(`  Beta Application: http://localhost:${PORT}/app/`);
  console.log(`  Health Endpoint:  http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
