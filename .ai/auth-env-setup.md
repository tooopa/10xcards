# Environment Variables Setup for Authentication

## Required Environment Variables

Add the following variables to your `.env` file:

```env
# Supabase Configuration
# Get these values from your Supabase project dashboard: https://app.supabase.com

# Public Supabase URL (safe to expose to client)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public Anon Key (safe to expose to client, RLS protected)
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Service Role Key (NEVER expose to client, server-only)
# Required for admin operations like deleting auth users
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## How to Get These Values

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the values:
   - **URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Migration from Old Variables

If you're upgrading from the old configuration, update these variable names:

```diff
- SUPABASE_URL=https://your-project.supabase.co
+ PUBLIC_SUPABASE_URL=https://your-project.supabase.co

- SUPABASE_KEY=your-anon-key-here
+ PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

+ SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Security Notes

⚠️ **IMPORTANT**: 
- `SUPABASE_SERVICE_ROLE_KEY` has **full database access** and **bypasses RLS**
- **NEVER** expose this key to the client
- **NEVER** commit this key to git
- Only use it in server-side code (API routes, services)
- Rotate this key periodically in production

✅ **Safe to expose**:
- `PUBLIC_SUPABASE_URL` - Public URL for your Supabase instance
- `PUBLIC_SUPABASE_ANON_KEY` - Public key protected by RLS policies

