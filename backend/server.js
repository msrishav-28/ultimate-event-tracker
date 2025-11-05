const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Import cron for scheduling
const cron = require('node-cron');

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'College Event Tracker API' });
});

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const processRoutes = require('./routes/process');
const reminderRoutes = require('./routes/reminders');
const friendsRoutes = require('./routes/friends');
const groupsRoutes = require('./routes/groups');
const leaderboardRoutes = require('./routes/leaderboards');
const integrationsRoutes = require('./routes/integrations');
const dataRoutes = require('./routes/data');
const reminderOptimizationRoutes = require('./routes/reminderOptimization');
const conflictsRoutes = require('./routes/conflicts');
const recurringEventsRoutes = require('./routes/recurringEvents');
const contentAggregationRoutes = require('./routes/contentAggregation');
const recommendationsRoutes = require('./routes/recommendations');
const attendanceRoutes = require('./routes/attendance');
const emailDigestRoutes = require('./routes/emailDigest');
const smartPrepRoutes = require('./routes/smartPrep');
const organizerRoutes = require('./routes/organizer');
const llmRoutes = require('./routes/llm');
const futureIntegrationsRoutes = require('./routes/futureIntegrations');

// Import services
const reminderScheduler = require('./services/reminderScheduler');
const recurringEventsService = require('./services/recurringEventsService');
const emailDigestService = require('./services/emailDigestService');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB connected');
  // Start reminder scheduler after DB connection
  reminderScheduler.start();

  // Process recurring events daily at 2 AM
  const recurringJob = cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Processing recurring events...');
      await recurringEventsService.processRecurringEvents();
      console.log('Recurring events processed');
    } catch (error) {
      console.error('Error processing recurring events:', error);
    }
  });

  // Send weekly digest every Monday at 9 AM
  const digestJob = cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('Sending weekly digests...');
      await emailDigestService.sendBatchDigest();
      console.log('Weekly digests sent');
    } catch (error) {
      console.error('Error sending weekly digests:', error);
    }
  });

  recurringJob.start();
  digestJob.start();
  console.log('Recurring events scheduler started');
  console.log('Weekly digest scheduler started');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'College Event Tracker API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/process', processRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/reminders/optimize', reminderOptimizationRoutes);
app.use('/api/conflicts', conflictsRoutes);
app.use('/api/recurring', recurringEventsRoutes);
app.use('/api/content', contentAggregationRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/digest', emailDigestRoutes);
app.use('/api/prep', smartPrepRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/integrations/future', futureIntegrationsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
