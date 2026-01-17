# Waypal Hotel Expert 🐸

> Your AI Hotel Expert for the Best Rates. Expert Analysis | Price Tracking | 24/7 Travel Support

A modern, intelligent hotel price comparison and booking assistant built with Next.js and AI-powered backend integration.

## ✨ Features

### 🏨 Expert Mode (订房专家模式)
- **Structured Hotel Search**: Input hotel name, dates, guests, and room preferences
- **Multi-Platform Comparison**: Compare prices across LuxTrip, official websites, and OTAs (Agoda, Booking.com, etc.)
- **Smart Price Analysis**: Display total price, nightly rate, taxes, and fees
- **Perks & Promotions**: Visual badges for benefits (breakfast, points, VIP perks) and promotions
- **Policy Details**: Cancellation policies, payment methods, and booking terms

### 💬 General Chat Mode (普通对话模式)
- **Natural Language Q&A**: Ask hotel-related questions in plain language
- **Context-Aware**: Understands follow-up questions based on conversation history
- **Smart Intent Recognition**: Automatically detects booking intent vs. general inquiries

### 🎨 User Experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Sidebar History**: Quick access to previous conversations
- **Smooth Animations**: Framer Motion powered transitions
- **Emerald Green Branding**: Consistent frog-themed UI (#00CD52)

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TianzhuHuang/WaypalAnalyst.git
cd WaypalAnalyst
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
# Backend API
NEXT_PUBLIC_AGENT_BACKEND_URL=https://waypal-agent-backend-266509309806.asia-east1.run.app

# Database (Google Cloud SQL PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# NextAuth.js v5 (Authentication)
AUTH_SECRET=your-secret-key-here
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Legacy NextAuth variables (optional, for backward compatibility)
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

**Note**: For Google OAuth setup, configure the OAuth credentials in Google Cloud Console and add them to `.env.local`.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Project Structure

```
WaypalAnalyst/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main page (Sidebar + Chat)
│   ├── layout.tsx         # Root layout
│   └── globals.css       # Global styles
├── src/
│   ├── components/
│   │   ├── Analyst/      # Core chat components
│   │   │   ├── Analyst.tsx              # Main logic component
│   │   │   ├── EvaluationTable.tsx      # Price comparison table
│   │   │   ├── AnalystDatePicker.tsx    # Date picker
│   │   │   ├── SummaryPill.tsx          # Summary pill
│   │   │   └── StepLoader.tsx            # Loading animation
│   │   ├── Sidebar.tsx   # Sidebar (chat history)
│   │   └── Header.tsx    # Top navigation
│   └── api/
│       └── agentApi.ts   # API client (message/compare)
├── Dockerfile            # Docker configuration
├── cloudbuild.yaml       # Google Cloud Build config
└── README.md
```

## 🔧 Technology Stack

- **Framework**: Next.js 16.1.0 (React 18+)
- **Authentication**: NextAuth.js v5 (Google OAuth)
- **Database**: Google Cloud SQL (PostgreSQL) with Drizzle ORM
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Date Picker**: React DatePicker
- **Icons**: Lucide React
- **Type Safety**: TypeScript
- **Deployment**: Docker + Google Cloud Run

## 📡 API Integration

### Endpoints

- `POST /agent/message` - General conversation endpoint
- `POST /agent/compare` - Structured hotel comparison endpoint

### Response Types

- `evaluation` - Price comparison table (renders `EvaluationTable`)
- `general` - Chat message (renders `ChatMessage`)
- `clarification` - Missing information prompt

See [backend_api_reference.md](./backend_api_reference.md) for detailed API documentation.

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t waypal-hotel-expert .
```

### Run Container
```bash
docker run -p 3000:3000 waypal-hotel-expert
```

### Google Cloud Run Deployment
The project includes `cloudbuild.yaml` for automated CI/CD via Google Cloud Build.

## 📱 Demo

**Live Demo**: https://waypal-ai-luxury-hotel-assistant-279558140163.us-west1.run.app/

## 🔐 Authentication & Database

### Google OAuth Setup
The application uses NextAuth.js v5 with Google OAuth for authentication. Configure OAuth credentials in Google Cloud Console and add them to `.env.local`.

### Database Setup
The application uses Google Cloud SQL (PostgreSQL) with Drizzle ORM. Database schema is defined in `src/lib/db/schema.ts`.

**Key Features:**
- User profiles with preferences (bed preference, budget level, dietary restrictions)
- Conversation threads and messages persistence
- Order tracking (for future booking functionality)

## 📄 Documentation

- [Project Description](./PROJECT_DESCRIPTION.md) - Detailed project overview
- [Backend API Reference](./backend_api_reference.md) - API documentation
- [Module 1 Implementation](./MODULE_1_IMPLEMENTATION.md) - Login and conversation persistence implementation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is proprietary software. All rights reserved.

---

Made with ❤️ by Waypal Team




