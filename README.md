# Aarọ Care

A healthcare management application for streamlined patient care and team coordination.

## Features

- Patient management
- Care team coordination
- Authentication with Cognito
- API integration with backend services

## Setup

### Prerequisites

- Node.js
- npm or yarn

### Environment Variables

The application requires several environment variables to be set up. Create a `.env` file in both the root directory and the `backend` directory with the following variables (replace with your actual values):

```
# Frontend (.env in root or aarocare directory)
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_DOMAIN=your-cognito-domain
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Aarọ Care
VITE_SOCKET_URL=http://localhost:3001
VITE_DEBUG=false

# Backend (.env in backend directory)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-key
```

### Installation

```bash
# Install frontend dependencies
cd aarocare
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Running the Application

```bash
# Start backend
cd backend
npm start

# Start frontend
cd ../aarocare
npm run dev
```

## Security Note

This repository does not contain any sensitive information. All API keys, database credentials, and other secrets should be provided via environment variables and are not committed to version control.
