-- Public totals endpoint database role (already applied to the linked Neon branch).
--
-- 1. Create the role (Neon manages role passwords; never commit them):
--      neon roles create --name zahira_readonly --access read_only --database neondb
--
-- 2. Narrow the default table-wide SELECT grant to only the columns the totals
--    query needs, so a leaked URL cannot expose names, slips or password hashes.
--    Run as the database owner (e.g. through a privileged connection):

REVOKE ALL ON TABLE admin_users FROM zahira_readonly;
REVOKE ALL ON TABLE migrations FROM zahira_readonly;
REVOKE ALL ON TABLE campaigns FROM zahira_readonly;
GRANT SELECT (id, slug) ON TABLE campaigns TO zahira_readonly;
REVOKE ALL ON TABLE donations FROM zahira_readonly;
GRANT SELECT (campaign_id, amount_minor, status)
  ON TABLE donations TO zahira_readonly;

-- 3. Put the pooled connection string into READONLY_DATABASE_URL:
--      neon connection-string --role-name zahira_readonly --pooled
--
-- If READONLY_DATABASE_URL is unset, the endpoint falls back to the normal
-- pooled application URL. For a local Postgres/Docker setup, substitute a role
-- name/password you control in the statements above.
