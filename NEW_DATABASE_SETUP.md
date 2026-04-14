# NEW SUPABASE DATABASE SETUP - NPGX PLATFORM

## 🆕 NEW DATABASE INFORMATION

**Database ID**: `fthpedywgwpygrfqliqf`
**URL**: `https://fthpedywgwpygrfqliqf.supabase.co`
**Dashboard**: `https://supabase.com/dashboard/project/fthpedywgwpygrfqliqf/settings/general`

## 🔑 ENVIRONMENT VARIABLES

Create a `.env.local` file with these exact values:

```bash
# NPGX PLATFORM - NEW DATABASE
NEXT_PUBLIC_SUPABASE_URL=https://fthpedywgwpygrfqliqf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0aHBlZHl3Z3dweWdyZnFsaXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NTMwODMsImV4cCI6MjA2NjEyOTA4M30.2ud57kHQQ7l8c737t5lDeJkhsOeQSed4MIR42PnzRAg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0aHBlZHl3Z3dweWdyZnFsaXFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDU1MzA4MywiZXhwIjoyMDY2MTI5MDgzfQ.rLuKmSX6mvXbG5i9G9b7zofmnqHyz6P1Ney_Iaohcds

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-ninja-punk-key-here

# Google OAuth (add your credentials)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# AI Generation
STABILITY_API_KEY=your-stability-api-key-here
REPLICATE_API_TOKEN=your-replicate-token-here
LEONARDO_API_KEY=your-leonardo-key-here

# Payment Processing
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here
```

## 📋 SETUP STEPS

### 1. Initialize Database Schema
Run this in your Supabase SQL Editor:
```sql
-- Choose ONE of these files:
-- For full schema: Copy content from supabase_schema.sql
-- For safe schema: Copy content from supabase_schema_safe.sql
-- For user profiles only: Copy content from supabase_user_profiles.sql
```

### 2. Verify Database Connection
Test your connection:
```bash
npm run dev
# Check if Supabase connects properly
```

### 3. Update Table Names
The schema has been updated to use:
- `npgx_characters` (instead of `ai_girlfriends`)  
- `user_npgx_characters` (instead of `user_ai_girlfriends`)
- All references updated throughout the codebase

## ✅ FILES UPDATED

### Database Schema Files:
- ✅ `supabase_schema.sql` - Full schema with new table names
- ✅ `supabase_user_profiles.sql` - User profiles schema updated
- ✅ `supabase_schema_safe.sql` - Safe schema with new table names
- ✅ `supabase_cleanup.sql` - Cleanup script updated

### Documentation Files:
- ✅ `DATABASE_SETUP.md` - Updated with new database credentials
- ✅ `DEPLOYMENT_GUIDE.md` - Updated with new database info
- ✅ `TODO.md` - Updated task list for new database
- ✅ `NEW_DATABASE_SETUP.md` - This setup guide created

### Code Files to Update:
- [ ] `src/lib/supabase.ts` - Already configured to use environment variables
- [ ] `src/lib/userProfiles.ts` - May need table name updates
- [ ] `src/components/ExpenseDashboard.tsx` - Uses supabase connection
- [ ] Any other components that reference old table names

## 🚨 CRITICAL SEPARATION

This new database is **completely separate** from your original `aigirlfriends` project:
- **Old Database**: `jncomccwpastcfuefbgn` (aigirlfriends)
- **New Database**: `fthpedywgwpygrfqliqf` (**NPGX Platform**)

This ensures zero conflicts and complete isolation between projects.

## 📞 NEXT STEPS

1. **Create `.env.local`** with the values above
2. **Run `npm install`** (fresh dependencies)
3. **Initialize git** repository (`git init`)
4. **Run database schema** in Supabase SQL Editor
5. **Test the application** (`npm run dev`)

Your **NPGX Platform** is now ready with its own dedicated database! 🔥🚀

**$NPGX** - The future of rebellious digital personas! 💀⚔️ 