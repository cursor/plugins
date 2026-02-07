# Skill: Set Up Supabase Authentication

## Description

This skill walks through setting up authentication in a Supabase project, including email/password sign-up, OAuth providers, magic link (passwordless) login, and Row Level Security policies to protect user data.

## Prerequisites

- A Supabase project (local via `supabase init` or hosted via dashboard)
- Supabase CLI installed (`npm install -g supabase`)
- `@supabase/supabase-js` and `@supabase/ssr` packages installed in your project

## Steps

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 2. Configure Environment Variables

Create or update your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-side only, never expose
```

### 3. Create Supabase Client Utilities

#### Browser Client (client components)

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### Server Client (server components, route handlers, server actions)

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component
            // where cookies can't be set. This can be safely ignored
            // if middleware refreshes the session.
          }
        },
      },
    }
  );
}
```

#### Middleware (token refresh)

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 4. Email/Password Authentication

#### Sign Up

```ts
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
  options: {
    data: {
      full_name: 'Jane Doe',  // Custom user metadata
    },
    emailRedirectTo: `${origin}/auth/callback`,
  },
});

if (error) {
  console.error('Sign-up failed:', error.message);
}
```

#### Sign In

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123',
});
```

#### Sign Out

```ts
const { error } = await supabase.auth.signOut();
```

### 5. OAuth Provider Authentication

#### Configure Provider in Supabase Dashboard

1. Go to **Authentication → Providers** in the Supabase dashboard.
2. Enable your desired provider (Google, GitHub, Discord, etc.).
3. Add the client ID and client secret from the provider's developer console.
4. Set the redirect URL to `https://<project-ref>.supabase.co/auth/v1/callback`.

#### Implement OAuth Sign-In

```ts
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
});
```

#### Auth Callback Route (exchange code for session)

```ts
// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
```

### 6. Magic Link (Passwordless) Authentication

```ts
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
    shouldCreateUser: true,
  },
});

if (error) {
  console.error('Magic link failed:', error.message);
} else {
  // Show "Check your email" message
}
```

### 7. Auth State Listener

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

### 8. Protect Routes with RLS Policies

Create a migration to set up a profiles table with RLS:

```sql
-- supabase/migrations/20260101000000_create_profiles.sql

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 9. Protect Server Routes

```ts
// In a server action or API route
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function protectedAction() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // User is authenticated — proceed with action
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}
```

## Verification

1. **Sign up** with email/password and verify the confirmation email flow works.
2. **Sign in** and confirm the session is established (check `supabase.auth.getUser()`).
3. **Test OAuth** by signing in with a configured provider and verifying the callback.
4. **Test magic link** by requesting a link and clicking it from the email.
5. **Verify RLS** by trying to access another user's data — it should be denied.
6. **Check middleware** by accessing a protected route without auth — should redirect to login.

## Common Pitfalls

- **Forgetting middleware**: Without middleware, auth tokens are never refreshed and users get logged out.
- **Using `getSession()` for authorization**: On the server, always use `getUser()` which validates the token with Supabase. `getSession()` reads from the cookie without validation.
- **Exposing service role key**: Never use the service role key in client-side code. It bypasses all RLS.
- **Missing email templates**: Customize the email templates in the Supabase dashboard for sign-up confirmation and magic links.
- **CORS issues with OAuth**: Ensure your site URL and redirect URLs are configured in the Supabase dashboard under Authentication → URL Configuration.
