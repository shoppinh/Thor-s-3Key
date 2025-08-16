-- Enhanced Supabase schema for Thor's 3Key multiplayer game
-- Run these in your Supabase SQL Editor

-- Enable real-time on existing tables
-- Run these commands in Supabase SQL Editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE duels;
-- ALTER PUBLICATION supabase_realtime ADD TABLE actions;

-- Extend existing tables with new columns
DO $$
BEGIN
    -- Add columns to rooms table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'max_players') THEN
        ALTER TABLE rooms ADD COLUMN max_players int DEFAULT 6;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'current_round') THEN
        ALTER TABLE rooms ADD COLUMN current_round int DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'game_state') THEN
        ALTER TABLE rooms ADD COLUMN game_state text DEFAULT 'waiting';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'settings') THEN
        ALTER TABLE rooms ADD COLUMN settings jsonb DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'created_by') THEN
        ALTER TABLE rooms ADD COLUMN created_by uuid;
    END IF;
END
$$;

-- Add constraints to rooms
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'rooms_game_state_check') THEN
        ALTER TABLE rooms ADD CONSTRAINT rooms_game_state_check 
        CHECK (game_state IN ('waiting', 'setup', 'playing', 'finished'));
    END IF;
END
$$;

-- Extend players table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'user_id') THEN
        ALTER TABLE players ADD COLUMN user_id uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'avatar_url') THEN
        ALTER TABLE players ADD COLUMN avatar_url text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'is_online') THEN
        ALTER TABLE players ADD COLUMN is_online boolean DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'last_seen') THEN
        ALTER TABLE players ADD COLUMN last_seen timestamp with time zone DEFAULT now();
    END IF;
END
$$;

-- Extend duels table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'duels' AND column_name = 'status') THEN
        ALTER TABLE duels ADD COLUMN status text DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'duels' AND column_name = 'winner_team') THEN
        ALTER TABLE duels ADD COLUMN winner_team text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'duels' AND column_name = 'metadata') THEN
        ALTER TABLE duels ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;
END
$$;

-- Add constraint to duels
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'duels_status_check') THEN
        ALTER TABLE duels ADD CONSTRAINT duels_status_check 
        CHECK (status IN ('active', 'completed', 'cancelled'));
    END IF;
END
$$;

-- Create new tables
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE,
    role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    permissions jsonb DEFAULT '{"rooms": ["read", "write", "delete"], "users": ["read", "write"], "games": ["read", "write", "moderate"]}',
    created_at timestamp with time zone DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    session_data jsonb NOT NULL,
    round_number int DEFAULT 1,
    current_player_id uuid REFERENCES players(id),
    team1_score int DEFAULT 0,
    team2_score int DEFAULT 0,
    power_ups_used jsonb DEFAULT '{}',
    started_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now()),
    finished_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS game_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
    room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
    player_id uuid REFERENCES players(id),
    event_type text NOT NULL,
    event_data jsonb NOT NULL,
    timestamp timestamp with time zone DEFAULT timezone('utc', now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON game_events(timestamp);

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

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

-- Game Sessions policies
DROP POLICY IF EXISTS "Room participants can view game sessions" ON game_sessions;

CREATE POLICY "Room participants can view game sessions" ON game_sessions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM players p 
        JOIN rooms r ON p.room_id = r.id 
        WHERE r.id = room_id AND (p.user_id = auth.uid() OR r.created_by = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Game Events policies
DROP POLICY IF EXISTS "Room participants can view game events" ON game_events;

CREATE POLICY "Room participants can view game events" ON game_events FOR SELECT 
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

CREATE POLICY "Only admins can view admin users" ON admin_users FOR SELECT 
USING (auth.uid() = user_id);
-- Create functions

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
DROP TRIGGER IF EXISTS update_duels_updated_at ON duels;
CREATE TRIGGER update_duels_updated_at 
    BEFORE UPDATE ON duels
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON game_sessions;
CREATE TRIGGER update_game_sessions_updated_at 
    BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

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

-- Enable real-time on new tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE admin_users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
