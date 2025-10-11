-- Migrate existing servers from 'http' transport to 'streamable-http'
-- HTTP transport is deprecated and removed, streamable-http is the modern replacement
UPDATE Server SET transport = 'streamable-http' WHERE transport = 'http';