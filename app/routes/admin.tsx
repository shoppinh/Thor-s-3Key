
import { useState, useEffect } from 'react'
import AdminDashboard from '~/components/AdminDashboard'
import { supabase } from '~/utils/supabaseClient'

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndAdminStatus()
  }, [])

  const checkAuthAndAdminStatus = async () => {
    console.log("Yo!")
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      console.log("🚀 ---------------------------------------------------------🚀");
      console.log("🚀 ~ admin.tsx:18 ~ checkAuthAndAdminStatus ~ user:", user);
      console.log("🚀 ---------------------------------------------------------🚀");

      
      if (authError) {
        console.error('Auth error:', authError)
        setLoading(false)
        return
      }

      setUser(user)

      if (user) {
        // Check if user is an admin
        const { data, error } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single()
        
          console.log("🚀 ---------------------------------------------------------🚀");
          console.log("🚀 ~ admin.tsx:40 ~ checkAuthAndAdminStatus ~ data:", data);
          console.log("🚀 ---------------------------------------------------------🚀");
        if (error && error.code !== 'PGRST116') {
          console.error('Admin check error:', error)
        }
        
        setIsAdmin(!!data)
      }
    } catch (error) {
      console.error('Failed to check admin status:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        setAuthError(error.message);
        console.error('Sign in error:', error);
      } else {
        setUser(data.user);
      }
    } catch (error: any) {
      setAuthError(error.message || 'Unknown error');
      console.error('Sign in error:', error);
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px'
      }}>
        <h1>Admin Login Required</h1>
        <p>You need to sign in with your admin email and password.</p>
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 300 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Sign In
          </button>
          {authError && <div style={{ color: 'red', fontSize: 14 }}>{authError}</div>}
        </form>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Note: You need to be added as an admin user in the database to access the dashboard.
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <div style={{ 
        padding: '10px 20px', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span>Signed in as: <strong>{user.email}</strong></span>
          {isAdmin && <span style={{ marginLeft: '15px', color: 'green' }}>✓ Admin</span>}
        </div>
        <button
          onClick={handleSignOut}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
      
      <AdminDashboard isAdmin={isAdmin} />
    </div>
  )
}
