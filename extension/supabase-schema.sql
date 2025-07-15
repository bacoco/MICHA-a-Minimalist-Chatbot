-- Supabase Database Schema for Universal Web Assistant
-- Hash-based caching system for Jina transcriptions and chat history

-- Table for storing page transcriptions with hash-based caching
CREATE TABLE IF NOT EXISTS jina_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_hash TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cached_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_jina_transcriptions_hash ON jina_transcriptions(page_hash);
CREATE INDEX IF NOT EXISTS idx_jina_transcriptions_user ON jina_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_jina_transcriptions_url ON jina_transcriptions(url);

-- Table for storing chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_hash TEXT NOT NULL,
  url TEXT NOT NULL,
  site_type TEXT NOT NULL,
  language TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_hash ON chat_sessions(user_id, page_hash);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_url ON chat_sessions(url);

-- Table for storing individual chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE jina_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jina_transcriptions
CREATE POLICY "Users can view their own transcriptions" ON jina_transcriptions
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert their own transcriptions" ON jina_transcriptions
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own transcriptions" ON jina_transcriptions
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own transcriptions" ON jina_transcriptions
  FOR DELETE USING (user_id = current_setting('app.user_id', true));

-- Alternative policies using header-based user context (fallback)
CREATE POLICY "Users can view their own transcriptions via header" ON jina_transcriptions
  FOR SELECT USING (
    current_setting('app.user_id', true) IS NULL AND 
    user_id = current_setting('request.headers', true)::json->>'x-user-id'
  );

CREATE POLICY "Users can insert their own transcriptions via header" ON jina_transcriptions
  FOR INSERT WITH CHECK (
    current_setting('app.user_id', true) IS NULL AND 
    user_id = current_setting('request.headers', true)::json->>'x-user-id'
  );

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view their own sessions" ON chat_sessions
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert their own sessions" ON chat_sessions
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own sessions" ON chat_sessions
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own sessions" ON chat_sessions
  FOR DELETE USING (user_id = current_setting('app.user_id', true));

-- Alternative policies using header-based user context (fallback)
CREATE POLICY "Users can view their own sessions via header" ON chat_sessions
  FOR SELECT USING (
    current_setting('app.user_id', true) IS NULL AND 
    user_id = current_setting('request.headers', true)::json->>'x-user-id'
  );

CREATE POLICY "Users can insert their own sessions via header" ON chat_sessions
  FOR INSERT WITH CHECK (
    current_setting('app.user_id', true) IS NULL AND 
    user_id = current_setting('request.headers', true)::json->>'x-user-id'
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from their sessions" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can insert messages to their sessions" ON chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can update messages in their sessions" ON chat_messages
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY "Users can delete messages from their sessions" ON chat_messages
  FOR DELETE USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = current_setting('app.user_id', true)
    )
  );

-- Alternative policies using header-based user context (fallback)
CREATE POLICY "Users can view messages from their sessions via header" ON chat_messages
  FOR SELECT USING (
    current_setting('app.user_id', true) IS NULL AND 
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = current_setting('request.headers', true)::json->>'x-user-id'
    )
  );

CREATE POLICY "Users can insert messages to their sessions via header" ON chat_messages
  FOR INSERT WITH CHECK (
    current_setting('app.user_id', true) IS NULL AND 
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = current_setting('request.headers', true)::json->>'x-user-id'
    )
  );

-- Function to set user context for RLS policies
CREATE OR REPLACE FUNCTION set_user_context(user_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Set the user context for the current session
  PERFORM set_config('app.user_id', user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically clean up expired transcriptions
CREATE OR REPLACE FUNCTION cleanup_expired_transcriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM jina_transcriptions 
  WHERE cached_until < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update session updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session timestamp when messages are added
CREATE TRIGGER update_session_on_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_user_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_transcriptions() TO anon, authenticated;

-- Create a scheduled job to clean up expired transcriptions (if pg_cron is available)
-- This needs to be run manually or set up in Supabase dashboard
-- SELECT cron.schedule('cleanup-expired-transcriptions', '0 2 * * *', 'SELECT cleanup_expired_transcriptions();');

-- Example usage:
-- SELECT set_user_context('user_abc123_1234567890');
-- Now all queries will be filtered by this user ID through RLS policies

-- Insert some sample data for testing (optional)
-- INSERT INTO jina_transcriptions (page_hash, url, content, user_id, cached_until) 
-- VALUES ('sample_hash', 'https://example.com', 'Sample content', 'user_123', NOW() + INTERVAL '1 day');