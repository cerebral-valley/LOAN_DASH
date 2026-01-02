# City Central Loan Dashboard - TypeScript Migration

This project has been migrated from Python/Streamlit to TypeScript with a modern tech stack.

## Tech Stack

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - REST API framework
- **TypeORM** - Database ORM
- **MySQL** - Database

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Beautiful, accessible components
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Project Structure

```
LOAN_DASH/
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # API controllers
│   │   ├── entities/        # TypeORM entities
│   │   ├── routes/          # API routes
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Next.js React app
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities and API client
│   ├── package.json
│   └── tsconfig.json
└── README_TYPESCRIPT.md     # This file
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MySQL database (same as before)
- Environment variables configured

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure your database credentials in `.env`:
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASS=your_password
MYSQL_DB=loan_dash
PORT=3001
NODE_ENV=development
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## API Endpoints

### Loans
- `GET /api/loans` - Get all loans
- `GET /api/loans/:id` - Get loan by ID
- `GET /api/loans/active` - Get active loans
- `GET /api/loans/released` - Get released loans
- `GET /api/loans/stats` - Get loan statistics
- `GET /api/loans/customer-type/:type` - Get loans by customer type
- `GET /api/loans/download/csv` - Download loans as CSV

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get expense by ID
- `GET /api/expenses/stats` - Get expense statistics
- `GET /api/expenses/download/csv` - Download expenses as CSV

## Features

### Existing Pages (Migrated)
- Executive Dashboard
- Overview
- Yearly Breakdown
- Client Wise Analysis
- Vyapari Wise Analysis
- Active Vyapari Loans
- Granular Analysis
- Expense Tracker
- Interest Yield Analysis
- Smart Recommendations
- Gold & Silver Rates

### New Analytics Pages
1. **Portfolio Summary** - Advanced portfolio metrics
2. **Customer Analytics** - Customer behavior analysis
3. **Risk Assessment** - Risk matrix and scoring
4. **Profitability Analysis** - Revenue and profit tracking
5. **Aging Analysis** - Loan aging reports
6. **Payment History** - Payment tracking and trends
7. **LTV Trends** - Loan-to-value analysis
8. **Revenue Projections** - Forecasting and projections
9. **Performance Dashboard** - Comparative performance metrics

### Key Features
- ✅ CSV export for all tables
- ✅ Modern, responsive UI with shadcn/ui
- ✅ Type-safe development with TypeScript
- ✅ RESTful API architecture
- ✅ Optimized database queries with TypeORM
- ✅ Clean, maintainable codebase

## Development

### Backend
```bash
cd backend
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Frontend
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Production Deployment

### Backend
1. Build the backend:
```bash
cd backend
npm run build
```

2. Start the production server:
```bash
NODE_ENV=production npm start
```

### Frontend
1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Start the production server:
```bash
npm start
```

Or deploy to Vercel:
```bash
vercel deploy
```

## Migration Notes

- All Python/Streamlit code remains in the repository for reference
- Database schema remains unchanged
- API endpoints designed to match original functionality
- Enhanced with additional analytics and reporting features
- Improved performance with Next.js SSR and API caching

## Support

For issues or questions, please refer to the original Python documentation or create an issue in the repository.
