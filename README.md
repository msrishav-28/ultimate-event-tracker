# College Event Tracker PWA

A Progressive Web Application for managing college events with AI-powered features, social networking, and calendar integration.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-47a248.svg)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg)](https://www.typescriptlang.org/)

## Features

- **AI-Powered Processing**: Claude LLM integration for intelligent content generation, email parsing, and personalized recommendations
- **Progressive Web App**: Offline functionality, installable, responsive design across all devices
- **Smart Recommendations**: ML-powered event suggestions based on user preferences
- **Social Features**: Friend networks, study groups, and leaderboards
- **Calendar Integration**: Bidirectional Google Calendar sync
- **Email Integration**: Gmail scanning and intelligent email digests
- **Gamification**: Achievement tracking and competitive features
- **Organizer Tools**: Event management and analytics dashboard
- **Push Notifications**: Real-time alerts with customization
- **Conflict Resolution**: Intelligent scheduling optimization
- **Advanced Search**: Full-text search with filters
- **Data Portability**: Export capabilities and GDPR compliance

---

## Technical Architecture

### Frontend Architecture

| Component Layer | Technology Stack |
|-----------------|------------------|
| **Application Framework** | React 18.3.1 + TypeScript 5.6.3 |
| **Build System** | Vite 6.0.1 |
| **UI Framework** | Tailwind CSS 3.4.15 + shadcn/ui |
| **State Management** | React Context + Custom Hooks |
| **Routing Architecture** | Screen-based Navigation |
| **Progressive Enhancement** | Service Worker API |

### Backend Architecture

| System Component | Technology Implementation |
|------------------|---------------------------|
| **Runtime Environment** | Node.js 18+ LTS |
| **API Framework** | Express.js 4.18.2 |
| **Data Persistence** | MongoDB 7+ + Mongoose 7.5.3 |
| **Authentication System** | JWT 9.0.2 + bcryptjs 2.4.3 |
| **Input Validation** | Express Validator + Mongoose Schemas |
| **Background Processing** | Node Cron + Queue Systems |

### AI & ML Infrastructure

| AI Component | Implementation |
|--------------|----------------|
| **Primary Language Model** | Anthropic Claude 4.5 Sonnet |
| **Natural Language Processing** | Compromise.js 14.10.0 |
| **Date/Time Intelligence** | Chrono Node 2.7.0 |
| **Fallback Processing** | Rule-Based Algorithms |

### Security & Compliance

| Security Layer | Implementation |
|----------------|----------------|
| **API Security** | Helmet 7.0.0 + CORS |
| **Rate Limiting** | Express Rate Limit 6.10.0 |
| **Data Encryption** | bcryptjs + TLS 1.3 |
| **Input Sanitization** | Validator Libraries + Schema Validation |
| **Audit Logging** | Winston Logging Framework |
| **Access Control** | Role-Based Permissions |

---

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- MongoDB Atlas account
- Modern web browser with PWA support

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-organization/college-event-tracker.git
cd college-event-tracker
```

2. Install dependencies
```bash
npm install
cd backend && npm install && cd ..
```

3. Configure environment variables
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

4. Start development servers
```bash
npm run dev              # Frontend on port 5173
cd backend && npm start  # Backend on port 5000
```

### Environment Variables
```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Authentication Security
JWT_SECRET=your-256-bit-secret-key-here

# Frontend Configuration
FRONTEND_URL=https://your-domain.com

# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=service@yourdomain.com
EMAIL_PASS=application-specific-password
```

#### Optional AI/ML Configuration
```env
# Claude AI Integration
CLAUDE_API_KEY=sk-ant-api03-your-key-here

# Feature Control
LLM_FEATURES=prep_checklist,recommendations,email_content

# Analytics Integration
GOOGLE_ANALYTICS_ID=GA-MEASUREMENT-ID
MIXPANEL_TOKEN=your-mixpanel-project-token
```

---

## API Reference

### Core API Endpoints

#### Authentication Endpoints
```http
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/profile
PUT    /api/auth/profile
POST   /api/auth/change-password
```

#### Event Management
```http
GET    /api/events
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id
POST   /api/events/process
```

#### Social Features
```http
GET    /api/friends
POST   /api/friends/request
POST   /api/friends/accept
DELETE /api/friends/:id
GET    /api/groups
POST   /api/groups
POST   /api/groups/:id/join
```

#### AI-Powered Features
```http
GET    /api/recommendations
POST   /api/prep/:eventId/generate
GET    /api/llm/status
POST   /api/llm/complete
POST   /api/llm/email-content
```

#### Organizer Dashboard
```http
POST   /api/organizer/event/:id/activate
POST   /api/organizer/event/:id/announce
GET    /api/organizer/event/:id/analytics
POST   /api/organizer/event/:id/rsvp
POST   /api/organizer/event/:id/certificates
```

#### Integration Endpoints
```http
GET    /api/calendar/auth
GET    /api/calendar/auth/callback
GET    /api/calendar/calendars
POST   /api/calendar/sync
POST   /api/integrations/gmail/connect
GET    /api/integrations/gmail/scan
```

---

## Deployment

### Frontend (Vercel)
```bash
npm install -g vercel
vercel --prod
```

### Backend (Render)
See `render.yaml` for configuration.

---

## Future Integrations

See [`FUTURE_INTEGRATIONS.md`](FUTURE_INTEGRATIONS.md) for planned integrations.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

---

## License

MIT License - see LICENSE file for details

---

## Development & Contribution

### Development Workflow

#### Local Development Setup
```bash
# Clone repository
git clone https://github.com/your-organization/college-event-tracker.git
cd college-event-tracker

# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure environment
cp .env.example .env
cp backend/.env.example backend/.env

# Start development servers
npm run dev              # Frontend development server
cd backend && npm start  # Backend development server
```

#### Code Quality Standards

##### TypeScript Standards
- **Strict Type Checking**: All components and functions fully typed
- **Interface Definitions**: Comprehensive API contract definitions
- **Generic Types**: Proper use of TypeScript generics
- **Type Guards**: Runtime type validation where necessary

##### Code Style Guidelines
- **ESLint Configuration**: Airbnb rules with React-specific extensions
- **Prettier Formatting**: Consistent code formatting across the codebase
- **Import Organization**: Logical grouping and alphabetical ordering
- **Naming Conventions**: PascalCase for components, camelCase for utilities

##### Testing Requirements
```bash
# Execute test suites
npm run test                    # Unit test execution
npm run test:coverage          # Coverage report generation
npm run test:integration       # Integration test suite
npm run test:e2e               # End-to-end test execution

# Code quality verification
npm run lint                   # ESLint code analysis
npm run type-check             # TypeScript compilation check
npm run build                  # Production build verification
```

### Contribution Process

#### Pull Request Workflow
1. **Branch Creation**: `git checkout -b feature/enhanced-ai-recommendations`
2. **Code Implementation**: Follow established patterns and conventions
3. **Testing Implementation**: Comprehensive test coverage for new features
4. **Documentation Updates**: Update README and API documentation
5. **Pull Request Submission**: Detailed description of changes and rationale
6. **Code Review**: Peer review and feedback incorporation
7. **Merge Approval**: Quality assurance and integration testing

#### Commit Message Standards
```bash
# Format: type(scope): description
feat(auth): implement JWT authentication system
fix(ui): resolve mobile responsiveness issue
docs(api): update endpoint documentation
refactor(db): optimize query performance
test(utils): add date formatting test coverage