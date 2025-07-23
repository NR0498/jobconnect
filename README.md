# JobConnect - Professional Job Board Platform

A comprehensive job listing platform inspired by Glassdoor, built with modern web technologies and designed specifically for Indian students and professionals seeking opportunities both domestically and internationally.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login/logout using Replit Auth with OpenID Connect
- **Job Search & Filtering**: Advanced search with filters for job type, experience level, location, salary, and more
- **Company Profiles**: Browse verified companies with detailed information and job listings
- **Research Opportunities**: Dedicated section for academic and industry research positions
- **Study Abroad Programs**: International education opportunities with eligibility information for Indian students
- **Job Applications**: Apply to jobs and track application status
- **Saved Jobs**: Bookmark interesting positions for later review
- **Job Posting**: Authenticated users can post new job openings

### Design & User Experience
- **Professional UI**: Glassdoor-inspired design with modern, clean aesthetics
- **Dark/Light Theme**: Toggle between themes with smooth transitions
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Purple & White Theme**: Professional color scheme with purple gradients
- **Real-time Updates**: Live job listings and application tracking
- **International Focus**: Special features for visa sponsorship and work permits

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Wouter** for lightweight client-side routing
- **TanStack Query** (React Query) for server state management
- **Tailwind CSS** for styling with custom purple theme
- **Shadcn/ui** components built on Radix UI primitives
- **React Hook Form** with Zod validation for forms
- **Lucide React** for consistent iconography

### Backend
- **Node.js** with TypeScript
- **Express.js** for REST API development
- **PostgreSQL** database with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations
- **Replit Auth** with OpenID Connect for authentication
- **Express Sessions** with PostgreSQL store for session management

### Database Schema
- **Users**: Profile information from authentication
- **Companies**: Company profiles and details
- **Jobs**: Job listings with comprehensive filtering options
- **Applications**: Job application tracking
- **Saved Jobs**: User bookmarking system
- **Study Programs**: International education opportunities
- **Sessions**: Secure session storage

## 📁 Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   ├── pages/          # Application pages/routes
│   │   └── ...
├── server/                 # Express backend API
│   ├── db.ts              # Database configuration
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   ├── replitAuth.ts      # Authentication setup
│   └── ...
├── shared/                 # Shared TypeScript types and schemas
│   └── schema.ts          # Drizzle database schema
└── ...
```

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (provided by Replit)
- Replit account for authentication

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd jobconnect
   npm install
   ```

2. **Environment Variables**
   The following environment variables are automatically provided in Replit:
   - `DATABASE_URL` - PostgreSQL connection string
   - `SESSION_SECRET` - Session encryption key
   - `REPL_ID` - Replit application identifier
   - `REPLIT_DOMAINS` - Allowed domains for authentication

3. **Database Setup**
   ```bash
   # Generate and push database schema
   npx drizzle-kit generate
   npx drizzle-kit push
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

The application will be available at the provided Replit URL.

## 🎯 Key Features for Indian Students

### International Opportunities
- **Visa Sponsorship**: Jobs offering visa sponsorship clearly marked
- **Study Abroad**: Programs with eligibility criteria for Indian students
- **Work Permits**: Information about post-study work opportunities
- **Scholarship Details**: Available funding options and scholarships

### Career Guidance
- **Experience Levels**: Clear categorization from entry to senior positions
- **Salary Information**: Transparent salary ranges in INR and international currencies
- **Company Insights**: Detailed company profiles with industry information
- **Research Positions**: Academic and industry research opportunities

## 📊 Sample Data

The application comes pre-loaded with sample data including:
- 6 verified companies across different industries
- 8 diverse job listings (full-time, internship, research)
- 6 international study programs from top universities
- Various salary ranges and experience levels

## 🔐 Authentication & Security

- **Replit Auth Integration**: Secure OpenID Connect authentication
- **Session Management**: PostgreSQL-backed sessions with proper expiration
- **Route Protection**: Authentication required for sensitive operations
- **Data Validation**: Comprehensive input validation using Zod schemas

## 🎨 Design Philosophy

- **Professional**: Clean, modern interface suitable for career platforms
- **Accessible**: Proper contrast ratios and semantic HTML
- **Responsive**: Mobile-first design with desktop enhancements
- **Consistent**: Uniform spacing, typography, and color usage
- **International**: Designed for global opportunities and diverse users

## 🚀 Deployment

### Replit Deployment (Recommended)
1. The application is configured for Replit Deployments
2. Click the "Deploy" button in your Replit workspace
3. The app will be automatically built and deployed
4. Access your live application at the provided `.replit.app` domain

### Manual Deployment
For other platforms, ensure:
- Node.js 20+ runtime
- PostgreSQL database
- Required environment variables
- Build the frontend: `npm run build`
- Start the server: `npm start`

## 📝 API Documentation

### Authentication Endpoints
- `GET /api/auth/user` - Get current user information
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout current user

### Job Endpoints
- `GET /api/jobs` - List jobs with optional filters
- `GET /api/jobs/search` - Search jobs by query and location
- `GET /api/jobs/:id` - Get specific job details
- `POST /api/jobs` - Create new job (authenticated)

### Application Endpoints
- `GET /api/applications` - User's job applications
- `POST /api/applications` - Apply to a job

### Study Program Endpoints
- `GET /api/study-programs` - List study abroad programs
- `GET /api/study-programs/:id` - Get program details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

---

**Built with ❤️ for the global Indian student and professional community**