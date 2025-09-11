require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { generateIdCard } = require('./utils/generateIdCard');

const app = express();

// ==============================================
// MIDDLEWARE CONFIGURATION
// ==============================================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use(morgan('dev'));

// ==============================================
// DATABASE CONNECTION
// ==============================================
const connectWithRetry = () => {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/icard_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

// ==============================================
// ROUTES
// ==============================================
app.use('/api/admin', require('./controllers/adminController'));
app.use('/api/status', require('./controllers/statusController'));
app.use('/api/user', require('./controllers/userController'));
app.use('/api/forms', require('./controllers/formController'));

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.get('/apply-gazetted', (req, res) => res.sendFile(path.join(__dirname, 'public', 'apply-gazetted.html')));
app.get('/apply-non-gazetted', (req, res) => res.sendFile(path.join(__dirname, 'public', 'apply-non-gazetted.html')));
app.get('/user-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html')));

// ==============================================
// ID CARD GENERATION ENDPOINT
// ==============================================
app.post('/api/generate-idcard', async (req, res) => {
  try {
    const { application, type } = req.body;
    
    if (!application || !type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const pdfBuffer = await generateIdCard(application, type);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=railway_id_card.pdf',
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('ID Card generation failed:', error);
    res.status(500).json({ 
      error: 'Failed to generate ID card',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==============================================
// PDF GENERATION FUNCTION (UPDATED DESIGN - 2 PAGES)
// ==============================================

// ==============================================
// HELPER FUNCTIONS
// ==============================================
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      date.getFullYear()
    ].join('-');
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'N/A';
  }
}

// ==============================================
// SERVER STARTUP
// ==============================================
const PORT = process.env.PORT || 3000;

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is already in use, trying port ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  // ==============================================
  // ERROR HANDLING
  // ==============================================
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
  });

  return server;
};

startServer(PORT);