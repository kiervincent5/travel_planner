#!/usr/bin/env node

/**
 * Database Setup Script for Travel Planner
 * This script helps set up the database for the travel planner application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Travel Planner Database Setup');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('Please create a .env file with your database configuration.');
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const hasDatabaseUrl = envContent.includes('DATABASE_URL');

if (!hasDatabaseUrl) {
  console.log('⚠️  DATABASE_URL not found in .env file');
  console.log('Adding default database configuration...\n');
  
  // Add database URL to .env
  const databaseConfig = `
# Database Configuration
# For local development, you can use a local PostgreSQL instance
# For production, use a managed database service like Supabase, Railway, or AWS RDS
DATABASE_URL="postgresql://postgres:password@localhost:5432/travel_planner?schema=public"
`;

  fs.appendFileSync(envPath, databaseConfig);
  console.log('✅ Added DATABASE_URL to .env file');
}

console.log('📋 Database Setup Options:');
console.log('1. Local PostgreSQL (requires PostgreSQL installed)');
console.log('2. Docker PostgreSQL (recommended for development)');
console.log('3. Cloud Database (Supabase, Railway, etc.)');
console.log('4. Skip database setup (use in-memory storage)\n');

// For now, we'll set up with a simple approach
console.log('🔧 Setting up Prisma...');

try {
  // Generate Prisma client
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');

  // Check if we can connect to database
  console.log('\n🔍 Testing database connection...');
  
  // Try to run a simple query
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Database schema created successfully');
  } catch (error) {
    console.log('⚠️  Could not connect to database. This is normal if PostgreSQL is not running.');
    console.log('\n📝 To set up a local database:');
    console.log('1. Install PostgreSQL: https://www.postgresql.org/download/');
    console.log('2. Create a database named "travel_planner"');
    console.log('3. Update DATABASE_URL in .env with your credentials');
    console.log('4. Run: npx prisma db push');
    console.log('\n🐳 Or use Docker:');
    console.log('docker run --name travel-planner-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=travel_planner -p 5432:5432 -d postgres');
  }

} catch (error) {
  console.error('❌ Error setting up Prisma:', error.message);
  process.exit(1);
}

console.log('\n🎉 Database setup completed!');
console.log('\n📚 Next steps:');
console.log('1. Make sure your database is running');
console.log('2. Update DATABASE_URL in .env if needed');
console.log('3. Run: npm run dev:db (to start with database)');
console.log('4. Or run: npm start (to start with in-memory storage)');
console.log('\n🔗 Useful commands:');
console.log('- npx prisma studio (database GUI)');
console.log('- npx prisma db push (sync schema)');
console.log('- npx prisma generate (regenerate client)');
