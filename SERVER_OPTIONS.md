# 🚀 **Server Options Explained**

## 📋 **What Each Command Does**

### **🏃‍♂️ Server Commands (Start the Application)**

| Command | What it does | Database | Best for |
|---------|-------------|----------|----------|
| `npm start` | Starts basic server | ❌ In-memory only | Quick testing |
| `npm run start:with-db` | Starts server with database | ✅ PostgreSQL | Development with DB |
| `npm run start:prod` | Starts production server | ✅/❌ Auto-detects | Production deployment |

### **🔧 Database Commands (Manage the Database)**

| Command | What it does | When to use |
|---------|-------------|-------------|
| `npm run setup:db` | Sets up database configuration | First time setup |
| `npm run db:generate` | Generates Prisma client | After schema changes |
| `npm run db:push` | Syncs schema to database | After schema changes |
| `npm run db:studio` | Opens database GUI | View/edit data |
| `npm run db:migrate` | Creates migration files | Production deployments |

## 🗄️ **Database Setup Process**

### **Step 1: Start the Database**
You need to run a PostgreSQL database server first:

**Option A: Docker (Easiest)**
```bash
docker run --name travel-planner-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=travel_planner \
  -p 5432:5432 \
  -d postgres
```

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL first, then:
sudo -u postgres createdb travel_planner
```

### **Step 2: Setup Database Schema**
```bash
npm run setup:db
npm run db:push
```

### **Step 3: Start Server with Database**
```bash
npm run start:with-db
```

## 🎯 **Quick Start Guide**

### **Just Want to Test? (No Database)**
```bash
npm start
# Visit: http://localhost:3000
```

### **Want Full Features? (With Database)**
```bash
# 1. Start database
docker run --name travel-planner-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=travel_planner -p 5432:5432 -d postgres

# 2. Setup schema
npm run db:push

# 3. Start server
npm run start:with-db

# Visit: http://localhost:3000
```

### **Production Deployment**
```bash
npm run start:prod
# This automatically detects if database is available
```

## 🔍 **How to Check What's Running**

### **Check if Database is Running**
```bash
# Docker
docker ps | grep postgres

# Local PostgreSQL
pg_isready -h localhost -p 5432
```

### **Check if Server is Running**
```bash
curl http://localhost:3000/api/health
```

## 🚨 **Common Issues**

### **"Database not available"**
- Database server is not running
- Wrong connection string in .env
- Database doesn't exist

### **"Port 3000 already in use"**
```bash
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### **"Cannot find module .prisma/client"**
```bash
npm run db:generate
```

## 💡 **Key Points**

1. **Database and Server are separate** - Database runs independently
2. **Server can work without database** - Falls back to in-memory storage
3. **Production server is smart** - Automatically detects database availability
4. **All APIs work regardless** - Maps, Weather, and Flight APIs don't need database

## 🎯 **Recommended Workflow**

### **Development**
```bash
# Start database once
docker run --name travel-planner-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=travel_planner -p 5432:5432 -d postgres

# Then use this for development
npm run dev:with-db
```

### **Production**
```bash
# Just use this - it handles everything
npm run start:prod
```

The server will automatically detect if the database is available and use it, or fall back to in-memory storage if not! 🚀

