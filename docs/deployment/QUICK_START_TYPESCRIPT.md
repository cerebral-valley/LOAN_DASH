# Quick Start Guide - TypeScript Migration

## Prerequisites
- Node.js 18+ and npm
- MySQL database (existing database from Python version)
- Git

## 🚀 Quick Setup (5 minutes)

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your MySQL credentials
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASS=your_password
# MYSQL_DB=loan_dash
# PORT=3001
# NODE_ENV=development

# Start development server
npm run dev
```

The backend API will be running at `http://localhost:3001`

Test it: `curl http://localhost:3001/health`

### 2. Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# The default API URL is already set to http://localhost:3001/api
# No changes needed unless you changed the backend port

# Start development server
npm run dev
```

The frontend will be running at `http://localhost:3000`

### 3. Verify Setup

1. Open browser to `http://localhost:3000`
2. You should be redirected to the Executive Dashboard
3. Navigate through the sidebar to explore all pages

## 📊 Available Pages

### Main Dashboards (Original)
- **Executive Dashboard** - KPI overview with key metrics
- Overview (to be migrated)
- Yearly Breakdown (to be migrated)
- Client Wise (to be migrated)
- Vyapari Wise (to be migrated)
- Active Vyapari Loans (to be migrated)
- Granular Analysis (to be migrated)
- Expense Tracker (to be migrated)
- Interest Yield Analysis (to be migrated)
- Smart Recommendations (to be migrated)
- Gold & Silver Rates (to be migrated)

### Advanced Analytics (New Features) ✅
1. **Portfolio Summary** - Portfolio metrics and distribution
2. **Customer Analytics** - Customer behavior and segmentation
3. **Risk Assessment** - Risk scoring and monitoring
4. **Profitability Analysis** - Revenue, expenses, and profit tracking
5. **Aging Analysis** - Loan age distribution and tracking
6. **Payment History** - Interest and principal payment tracking
7. **LTV Trends** - Loan-to-value ratio analysis
8. **Performance Dashboard** - Comparative performance metrics

## 🔄 CSV Export

All analytics pages support CSV export via the "Export CSV" button in the top-right corner.

## 🛠️ Development Commands

### Backend
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server (after build)
npm run lint     # Run ESLint
```

## 🎨 Tech Stack

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
- **Axios** - HTTP client

## 📝 API Endpoints

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

## 🚨 Troubleshooting

### Backend won't start
- Check MySQL is running: `mysql -u root -p`
- Verify `.env` credentials are correct
- Check port 3001 is not in use: `lsof -i :3001`

### Frontend shows connection error
- Verify backend is running at `http://localhost:3001`
- Check browser console for CORS errors
- Verify `.env.local` has correct `NEXT_PUBLIC_API_URL`

### Database connection error
- Ensure MySQL is running
- Verify database name exists: `SHOW DATABASES;`
- Check user has proper permissions

## 🎯 Next Steps

1. **Test the application** with your existing MySQL database
2. **Migrate remaining pages** from Python/Streamlit
3. **Add kokonut UI components** for enhanced AI features
4. **Customize styling** to match your brand
5. **Deploy to production** (Vercel for frontend, any Node.js host for backend)

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Tailwind CSS](https://tailwindcss.com/)

## 💡 Pro Tips

1. Use `npm run dev` in both backend and frontend terminals for hot reload
2. All pages have built-in loading states and error handling
3. CSV exports work for all data tables
4. The sidebar auto-highlights the active page
5. All API calls are typed with TypeScript for better IDE support

## 🤝 Support

For issues or questions, refer to the original Python documentation or create an issue in the repository.

---

**Happy coding! 🎉**
