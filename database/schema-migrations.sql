-- Enhanced Supabase schema for Thor's 3Key multiplayer game
-- Run these in your Supabase SQL Editor

-- =============================================================================
-- STEP 1: CREATE BASE TABLES (OPTIMIZED TO REDUCE DUPLICATION)
-- =============================================================================

-- Create base tables that are referenced in the schema
CREATE TABLE IF NOT EXISTS rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'setup', 'playing', 'finished')),
    max_players int DEFAULT 6,
    settings jsonb DEFAULT '{}',
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    user_id uuid,
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    position int,
    team text,
    cards jsonb DEFAULT '[]',
    avatar_url text,
    is_online boolean DEFAULT true,
    last_seen timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Unified game session that tracks the entire game progress
CREATE TABLE IF NOT EXISTS game_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    current_round int DEFAULT 1,
    current_player_id uuid REFERENCES players(id),
    team1_score int DEFAULT 0,
    team2_score int DEFAULT 0,
    session_data jsonb NOT NULL,
    power_ups_used jsonb DEFAULT '{}',
    started_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    finished_at timestamp with time zone
);

-- Simplified duels table - removed duplicate round tracking and status
CREATE TABLE IF NOT EXISTS duels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
    team1_player_id uuid REFERENCES players(id),
    team2_player_id uuid REFERENCES players(id),
    team1_card jsonb,
    team2_card jsonb,
    winner_team text CHECK (winner_team IN ('team1', 'team2', 'tie')),
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Unified events table - combines actions and game events
CREATE TABLE IF NOT EXISTS game_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
    player_id uuid REFERENCES players(id),
    event_type text NOT NULL CHECK (event_type IN (
        'player_join', 'player_leave', 'card_played', 'power_up_used', 
        'round_start', 'round_end', 'game_start', 'game_end', 'duel_result'
    )),
    event_data jsonb NOT NULL,
    timestamp timestamp with time zone DEFAULT timezone('utc', now())
);

-- =============================================================================
-- STEP 2: CREATE ADDITIONAL TABLES
-- =============================================================================

-- Create admin_users table (no dependencies)
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE,
    role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    permissions jsonb DEFAULT '{"rooms": ["read", "write", "delete"], "users": ["read", "write"], "games": ["read", "write", "moderate"]}',
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- =============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_duels_session_id ON duels(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON game_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type);

-- =============================================================================
-- STEP 4: CREATE FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to clean up old games
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS void AS $$
BEGIN
    -- Delete finished games older than 7 days
    DELETE FROM rooms 
    WHERE status = 'finished' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    -- Delete abandoned waiting rooms older than 1 day
    DELETE FROM rooms 
    WHERE status = 'waiting' 
    AND created_at < NOW() - INTERVAL '1 day'
    AND NOT EXISTS (SELECT 1 FROM players WHERE room_id = rooms.id);
END;
$$ language 'plpgsql';

-- =============================================================================
-- STEP 5: CREATE TRIGGERS (DEPENDS ON FUNCTIONS)
-- =============================================================================

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_duels_updated_at ON duels;
CREATE TRIGGER update_duels_updated_at 
    BEFORE UPDATE ON duels
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER update_game_sessions_updated_at 
    BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 7: CREATE RLS POLICIES (DEPENDS ON TABLES AND RLS BEING ENABLED)
-- =============================================================================

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view rooms" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Room creators and admins can update rooms" ON rooms;
DROP POLICY IF EXISTS "Room creators and admins can delete rooms" ON rooms;

-- Rooms policies
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);

CREATE POLICY "Users can create rooms" ON rooms FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators and admins can update rooms" ON rooms FOR UPDATE 
USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Room creators and admins can delete rooms" ON rooms FOR DELETE 
USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Players policies
DROP POLICY IF EXISTS "Users can view players in accessible rooms" ON players;
DROP POLICY IF EXISTS "Users can create their own player records" ON players;
DROP POLICY IF EXISTS "Users can update their own player records" ON players;

CREATE POLICY "Users can view players in accessible rooms" ON players FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM rooms WHERE id = room_id) OR
    user_id = auth.uid()
);

CREATE POLICY "Users can create their own player records" ON players FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own player records" ON players FOR UPDATE 
USING (user_id = auth.uid());

-- Duels policies
DROP POLICY IF EXISTS "Users can view duels in accessible sessions" ON duels;
DROP POLICY IF EXISTS "Users can create duels in accessible sessions" ON duels;
DROP POLICY IF EXISTS "Users can update duels they participate in" ON duels;

CREATE POLICY "Users can view duels in accessible sessions" ON duels FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM game_sessions gs
        JOIN players p ON p.room_id = gs.room_id 
        JOIN rooms r ON r.id = gs.room_id
        WHERE gs.id = session_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create duels in accessible sessions" ON duels FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM game_sessions gs
        JOIN players p ON p.room_id = gs.room_id 
        JOIN rooms r ON r.id = gs.room_id
        WHERE gs.id = session_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    )
);

CREATE POLICY "Users can update duels they participate in" ON duels FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM game_sessions gs
        JOIN players p ON p.room_id = gs.room_id 
        JOIN rooms r ON r.id = gs.room_id
        WHERE gs.id = session_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Game Events policies (simplified since actions table is removed)
DROP POLICY IF EXISTS "Room participants can view game events" ON game_events;
DROP POLICY IF EXISTS "Room participants can create game events" ON game_events;

CREATE POLICY "Room participants can view game events" ON game_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM game_sessions gs
        JOIN players p ON p.room_id = gs.room_id 
        JOIN rooms r ON r.id = gs.room_id
        WHERE gs.id = session_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Room participants can create game events" ON game_events FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM players p 
        WHERE p.id = player_id AND p.user_id = auth.uid()
    )
);

-- Game Sessions policies
DROP POLICY IF EXISTS "Room participants can view game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Room participants can create game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Room participants can update game sessions" ON game_sessions;

CREATE POLICY "Room participants can view game sessions" ON game_sessions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM players p 
        JOIN rooms r ON p.room_id = r.id 
        WHERE r.id = room_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Room participants can create game sessions" ON game_sessions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM players p 
        JOIN rooms r ON p.room_id = r.id 
        WHERE r.id = room_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    )
);

CREATE POLICY "Room participants can update game sessions" ON game_sessions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM players p 
        JOIN rooms r ON p.room_id = r.id 
        WHERE r.id = room_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Admin Users policies
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Only super admins can manage admin users" ON admin_users;

CREATE POLICY "Only admins can view admin users" ON admin_users FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only super admins can manage admin users" ON admin_users FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- =============================================================================
-- STEP 8: ENABLE REAL-TIME SUBSCRIPTIONS (FINAL STEP)
-- =============================================================================

-- Enable real-time on existing tables
-- Run these commands in Supabase SQL Editor after schema is deployed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE duels;
-- ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE game_events;

-- Enable real-time on new tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE admin_users;
