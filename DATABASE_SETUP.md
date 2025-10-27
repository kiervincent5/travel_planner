# 🗄️ Database Integration Setup Guide

## ✅ **What's Been Implemented**

The Travel Planner now has **full database integration** with PostgreSQL and Prisma ORM! Here's what's been added:

### **📊 Database Schema**
- **Users**: Authentication and user management
- **Trips**: Travel plans with dates and destinations
- **TripDays**: Daily itinerary organization
- **Activities**: Individual activities within each day
- **Budgets**: Budget tracking for trips
- **Expenses**: Individual expense tracking

### **🔧 New Files Created**
- `server-db.js` - Database-enabled server
- `database.js` - Prisma client configuration
- `prisma/schema.prisma` - Database schema definition
- `setup-database.js` - Database setup script

### **📦 New Dependencies**
- `@prisma/client` - Prisma ORM client
- `prisma` - Prisma CLI
- `pg` - PostgreSQL driver

## 🚀 **How to Run with Database**

### **Option 1: Quick Start (Recommended)**
```bash
# Start with database integration
npm run start:db

# Or for development with auto-restart
npm run dev:db
```

### **Option 2: Original Server (In-Memory)**
```bash
# Start with in-memory storage (original)
npm start
```

## 🗄️ **Database Setup Options**

### **Option 1: Docker PostgreSQL (Easiest)**
```bash
# Start PostgreSQL with Docker
docker run --name travel-planner-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=travel_planner \
  -p 5432:5432 \
  -d postgres

# Create the database schema
npm run db:push
```

### **Option 2: Local PostgreSQL**
1. Install PostgreSQL: https://www.postgresql.org/download/
2. Create database: `createdb travel_planner`
3. Update `.env` with your credentials:
   ```
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/travel_planner?schema=public"
   ```
4. Create schema: `npm run db:push`

### **Option 3: Cloud Database (Production)**
1. **Supabase** (Free tier): https://supabase.com/
2. **Railway**: https://railway.app/
3. **AWS RDS**: https://aws.amazon.com/rds/
4. **Google Cloud SQL**: https://cloud.google.com/sql

Update `.env` with your cloud database URL.

## 🔧 **Database Commands**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Open database GUI
npm run db:studio

# Create migration
npm run db:migrate

# Setup database (interactive)
npm run setup:db
```

## 📊 **New API Endpoints**

### **Trip Management**
- `GET /api/trips` - Get user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get specific trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### **Enhanced Authentication**
- All auth endpoints now use database
- User data persists between server restarts
- Secure password hashing with bcrypt

## 🎯 **Key Features Added**

### **1. Trip Management**
- Create, read, update, delete trips
- Organize trips by days and activities
- Track trip status (planning, confirmed, completed)

### **2. User Data Persistence**
- User accounts persist between server restarts
- Secure authentication with JWT tokens
- User-specific trip data

### **3. Budget Tracking**
- Set budgets for trips
- Track expenses by category
- Real-time budget monitoring

### **4. Activity Planning**
- Plan daily activities
- Set times and locations
- Track costs per activity

## 🔍 **Testing the Database Integration**

### **1. Start the Server**
```bash
npm run start:db
```

### **2. Test Health Check**
```bash
curl http://localhost:3000/api/health
```
Should return: `{"status":"ok","database":"connected"}`

### **3. Create a User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### **4. Create a Trip**
```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title":"My Trip","startDate":"2024-01-01","endDate":"2024-01-07","destination":"Tokyo"}'
```

## 🎉 **Benefits of Database Integration**

### **✅ Production Ready**
- Persistent data storage
- Scalable architecture
- Professional database design

### **✅ Enhanced Features**
- Trip management
- Budget tracking
- User-specific data
- Data relationships

### **✅ Better Security**
- Proper user authentication
- Data validation
- SQL injection protection

### **✅ Future Extensibility**
- Easy to add new features
- Scalable data model
- Professional development practices

## 🚨 **Troubleshooting**

### **Database Connection Issues**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d travel_planner
```

### **Prisma Issues**
```bash
# Regenerate client
npm run db:generate

# Reset database
npm run db:push --accept-data-loss
```

### **Port Conflicts**
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## 🎯 **Next Steps**

1. **Set up your database** (Docker recommended for development)
2. **Start the database-enabled server**: `npm run start:db`
3. **Test the new features** through the web interface
4. **Explore the database** with Prisma Studio: `npm run db:studio`

The system now has **enterprise-grade database integration** while maintaining all the original functionality! 🚀
