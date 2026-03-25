export const getOngoingQueriesSql = () => {
  const sql = /* SQL */ `
-- source: dashboard
-- description: List currently active queries with PID, query text, and start time
select pid, query, query_start from pg_stat_activity where state = 'active' and datname = 'postgres';
`.trim()

  return sql
}
