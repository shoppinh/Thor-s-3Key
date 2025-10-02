import { supabase } from '../utils/supabaseClient';
export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: Error | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SupabaseAuthService {
  getCurrentUser(): Promise<AuthResponse>;
  signIn(credentials: SignInCredentials): Promise<AuthResponse>;
  signOut(): Promise<{ error: Error | null }>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  isAdmin(userId: string): Promise<boolean>;
}

class SupabaseAuth implements SupabaseAuthService {
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      if (!data.user) {
        return { user: null, error: null };
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email
        },
        error: null
      };
    } catch (error) {
      return {
        user: null,
        error:
          error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  }

  async signIn({ email, password }: SignInCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      if (!data.user) {
        return {
          user: null,
          error: new Error('No user returned after sign in')
        };
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email
        },
        error: null
      };
    } catch (error) {
      return {
        user: null,
        error:
          error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error('Unknown error occurred')
      };
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email
        });
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  async isAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Admin check error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }
}

export const authService = new SupabaseAuth();
