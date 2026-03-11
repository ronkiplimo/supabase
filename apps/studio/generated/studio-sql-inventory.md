# Supabase Studio SQL Query Inventory

Generated automatically from `apps/studio/data/**/*.sql.ts`.

## data/database/database.sql.ts

### getLiveTupleEstimate

**Type:** metadata

**Tables touched:**
- pg_stat_user_tables

**Purpose:**
The query getLiveTupleEstimate retrieves the current estimated number of live rows (tuples) in a specified user table within a given schema by querying PostgreSQL's statistics view pg_stat_user_tables. This helps estimate table size and activity without running a full count.

```sql
SELECT n_live_tup AS live_tuple_estimate
FROM pg_stat_user_tables
WHERE schemaname = ${literal(schema)}
AND relname = ${literal(table)};
```

## data/database-cron-jobs/database-cron-jobs.sql.ts

### getJobRunDetailsPageCountSql

**Type:** metadata

**Tables touched:**
- pg_class

**Purpose:**
This query retrieves the total number of disk pages used by the 'job_run_details' table within the 'cron' schema by dividing its size in bytes by the database block size. It's useful for understanding the physical storage size and page count of that specific table.

```sql
SELECT pg_relation_size(oid) / current_setting('block_size')::int8 AS num_pages
FROM pg_class
WHERE relname = 'job_run_details'
  AND relnamespace = 'cron'::regnamespace;
```

### getDeleteOldCronJobRunDetailsByCtidSql

**Type:** read

**Tables touched:**
- cron.job_run_details
- deleted

**Purpose:**
This query deletes old records from the `cron.job_run_details` table within a specific CTID range where the job run has ended before a certain interval ago, and then returns the count of rows deleted. It is used to efficiently purge outdated cron job run details while tracking how many entries were removed.

```sql
WITH deleted AS (
  DELETE FROM cron.job_run_details
  WHERE ctid >= ${safeCtidStart}::tid
    AND ctid < ${safeCtidEnd}::tid
    AND end_time < now() - interval ${literal(interval)}
  RETURNING 1
)
SELECT count(*) as deleted_count FROM deleted;
```

### getScheduleDeleteCronJobRunDetailsSql

**Type:** read

**Tables touched:**
- cron.job_run_details

**Purpose:**
This query creates or updates a scheduled cron job named by CRON_CLEANUP_SCHEDULE_NAME that runs at the interval specified by CRON_CLEANUP_SCHEDULE_EXPRESSION to delete records from the cron.job_run_details table where the end_time is older than the given interval, helping to clean up old job run logs automatically.

```sql
SELECT cron.schedule(
  ${literal(CRON_CLEANUP_SCHEDULE_NAME)},
  ${literal(CRON_CLEANUP_SCHEDULE_EXPRESSION)},
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval ${literal(interval)}$$
);
```

### getCronJobsMinimalSql

**Type:** read

**Tables touched:**
- cron.job

**Purpose:**
The `getCronJobsMinimalSql` query retrieves a minimal set of details (job ID, name, schedule, command, and active status) for cron jobs from the `cron.job` table, optionally filtering results based on a provided search term. It is used to quickly fetch essential information about scheduled jobs for display or management purposes in the dashboard.

```sql
SELECT 
  job.jobid,
  job.jobname,
  job.schedule,
  job.command,
  job.active
FROM 
  cron.job job
${!!searchTerm ?
```

### getCronJobsSql

**Type:** read

**Tables touched:**
- cron.job_run_details
- latest_runs
- cron.job
- most_recent_runs

**Purpose:**
The getCronJobsSql query retrieves a list of all cron jobs along with their most recent run status and timestamp by joining the job metadata with the latest execution details from the job_run_details table. It helps developers and support engineers quickly see the current state and last execution time of each scheduled job for monitoring and troubleshooting purposes.

```sql
WITH latest_runs AS (
  SELECT 
    jobid,
    status,
    MAX(start_time) AS latest_run
  FROM cron.job_run_details
  GROUP BY jobid, status
), most_recent_runs AS (
  SELECT 
    jobid, 
    status, 
    latest_run
  FROM latest_runs lr1
  WHERE latest_run = (
    SELECT MAX(latest_run) 
    FROM latest_runs lr2 
    WHERE lr2.jobid = lr1.jobid
  )
)
SELECT 
  job.jobid,
  job.jobname,
  job.schedule,
  job.command,
  job.active,
  mr.latest_run,
  mr.status
FROM 
  cron.job job
LEFT JOIN most_recent_runs mr ON job.jobid = mr.jobid
${!!searchTerm ?
```

## data/database-extensions/database-extensions.sql.ts

### getDatabaseExtensionDefaultSchemaSQL

**Type:** metadata

**Tables touched:**
- pg_available_extension_versions

**Purpose:**
This query retrieves the name, version, and default schema of a specified database extension from the available extension versions in PostgreSQL. It helps identify the details of the given extension by filtering on its name and returning the first matching record.

```sql
select name, version, schema from pg_available_extension_versions where name = ${literal(extension)} limit 1;
```

## data/database-indexes/database-indexes.sql.ts

### getIndexesSQL

**Type:** metadata

**Tables touched:**
- pg_index
- pg_class
- pg_namespace
- LATERAL
- pg_attribute

**Purpose:**
This query retrieves detailed information about all indexes within a specified database schema, including the schema name, table name, index name, index definition, and the columns (or expressions) covered by each index. It helps developers or support engineers understand the indexing structure for performance tuning or troubleshooting.

```sql
SELECT
  n.nspname        AS schema,
  t.relname        AS "table",
  i.relname        AS name,
  pg_get_indexdef(idx.indexrelid) AS definition,
  STRING_AGG(
    COALESCE(a.attname, '(expression)'),
    ', ' ORDER BY k.ord
  ) AS columns
FROM pg_index idx
JOIN pg_class      t ON t.oid = idx.indrelid
JOIN pg_class      i ON i.oid = idx.indexrelid
JOIN pg_namespace  n ON n.oid = t.relnamespace
JOIN LATERAL unnest(idx.indkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
LEFT JOIN pg_attribute a
  ON a.attrelid = t.oid
 AND a.attnum   = k.attnum
WHERE n.nspname = '${schema}'
GROUP BY
  n.nspname,
  t.relname,
  i.relname,
  idx.indexrelid
ORDER BY
  schema, "table", name;
```

## data/privileges/privileges.sql.ts

### IGNORED_SCHEMAS

**Type:** metadata

**Tables touched:**
- pg_class
- pg_namespace
- lateral
- pg_roles

**Purpose:**
This query retrieves the access privileges (SELECT, INSERT, UPDATE, DELETE) for key roles (anon, authenticated, service_role) on database objects (tables, views, etc.) within schemas that are not in the ignored schemas list, enabling visibility into permission settings while excluding system or irrelevant schemas. It helps developers/support engineers audit and manage role-based access control for relevant database objects.

```sql
table_privileges as (
      select
        c.oid::int as id,
        n.nspname as schema_name,
        c.relname as name,
        c.relkind as kind,

        -- Anon Privileges
        bool_or(pr.rolname = 'anon' and acl.privilege_type = 'SELECT') as anon_select,
        bool_or(pr.rolname = 'anon' and acl.privilege_type = 'INSERT') as anon_insert,
        bool_or(pr.rolname = 'anon' and acl.privilege_type = 'UPDATE') as anon_update,
        bool_or(pr.rolname = 'anon' and acl.privilege_type = 'DELETE') as anon_delete,

        -- Authenticated Privileges
        bool_or(pr.rolname = 'authenticated' and acl.privilege_type = 'SELECT') as auth_select,
        bool_or(pr.rolname = 'authenticated' and acl.privilege_type = 'INSERT') as auth_insert,
        bool_or(pr.rolname = 'authenticated' and acl.privilege_type = 'UPDATE') as auth_update,
        bool_or(pr.rolname = 'authenticated' and acl.privilege_type = 'DELETE') as auth_delete,

        -- Service Role Privileges
        bool_or(pr.rolname = 'service_role' and acl.privilege_type = 'SELECT') as srv_select,
        bool_or(pr.rolname = 'service_role' and acl.privilege_type = 'INSERT') as srv_insert,
        bool_or(pr.rolname = 'service_role' and acl.privilege_type = 'UPDATE') as srv_update,
        bool_or(pr.rolname = 'service_role' and acl.privilege_type = 'DELETE') as srv_delete

      from pg_class c
      join pg_namespace n
        on n.oid = c.relnamespace
      left join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as acl
        on true
      left join pg_roles pr
        on pr.oid = acl.grantee
      where c.relkind in ('r', 'p', 'v', 'm', 'f')
        and n.nspname not in (${IGNORED_SCHEMAS_LIST})
        ${search ?
```

### IGNORED_SCHEMAS

**Type:** read

**Tables touched:**
- table_grants

**Purpose:**
This query retrieves a paginated list of table grants, including their IDs, schema names, table names, and statuses, along with the total count of such grants, useful for displaying or managing ignored schemas in a dashboard. It supports filtering and pagination through the provided search, offset, and limit parameters.

```sql
with ${getTableGrantsCTEs({ search })}
    select
      (select count(*)::int from table_grants) as total_count,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', tg.id,
              'schema', tg.schema_name,
              'name', tg.name,
              'status', tg.status
            )
          )
          from (
            select *
            from table_grants
            order by schema_name, name
            offset ${offset}
            limit ${limit}
          ) tg
        ),
        '[]'::jsonb
      ) as tables;
```

### IGNORED_SCHEMAS

**Type:** read

**Tables touched:**
- table_grants

**Purpose:**
The IGNORED_SCHEMAS query counts the total number of table grants and specifically counts how many of those grants have a status of 'granted' within the specified schemas. This helps identify the number of active grants versus total grants in the given schema list.

```sql
with ${getTableGrantsCTEs()}
    select
      count(*)::int as total_count,
      (count(*) filter (where status = 'granted' and schema_name in (${schemasList})))::int as grants_count
    from table_grants
```

### IGNORED_SCHEMAS

**Type:** metadata

**Tables touched:**
- pg_proc
- pg_namespace
- lateral
- pg_roles

**Purpose:**
The IGNORED_SCHEMAS query is designed to identify and aggregate EXECUTE privileges on functions within all schemas except those listed in IGNORED_SCHEMAS_LIST, specifically checking if the roles 'anon', 'authenticated', or 'service_role' have execution rights. This helps in monitoring or auditing function-level access permissions outside excluded schemas in the database.

```sql
function_privileges as (
      select
        n.nspname as schema_name,
        p.proname as name,

        -- Aggregate EXECUTE across all overloads + all 3 roles
        bool_or(pr.rolname = 'anon' and acl.privilege_type = 'EXECUTE') as anon_execute,
        bool_or(pr.rolname = 'authenticated' and acl.privilege_type = 'EXECUTE') as auth_execute,
        bool_or(pr.rolname = 'service_role' and acl.privilege_type = 'EXECUTE') as srv_execute

      from pg_proc p
      join pg_namespace n
        on n.oid = p.pronamespace
      left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as acl
        on true
      left join pg_roles pr
        on pr.oid = acl.grantee
      where p.prokind in ('f', 'w')
        and n.nspname not in (${IGNORED_SCHEMAS_LIST})
        ${search ?
```

### IGNORED_SCHEMAS

**Type:** read

**Tables touched:**
- function_grants

**Purpose:**
This query retrieves a paginated list of function grants along with their schema, name, and status, while also returning the total count of all function grants available. It's used to display and navigate through function grant records within the IGNORED_SCHEMAS context of the dashboard.

```sql
with ${getFunctionGrantsCTEs({ search })}
    select
      (select count(*)::int from function_grants) as total_count,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'schema', fg.schema_name,
              'name', fg.name,
              'status', fg.status
            )
          )
          from (
            select *
            from function_grants
            order by schema_name, name
            offset ${offset}
            limit ${limit}
          ) fg
        ),
        '[]'::jsonb
      ) as functions;
```

### IGNORED_SCHEMAS

**Type:** read

**Tables touched:**
- function_grants

**Purpose:**
This query counts the total number of function grants and specifically how many of those granted are within a given list of schemas (`schemasList`). It helps to monitor and compare the total grants versus granted functions in ignored or specified schemas.

```sql
with ${getFunctionGrantsCTEs()}
    select
      count(*)::int as total_count,
      (count(*) filter (where status = 'granted' and schema_name in (${schemasList})))::int as grants_count
    from function_grants
```

### buildTablePrivilegesSql

**Type:** metadata

**Tables touched:**
- pg_class
- pg_namespace

**Purpose:**
The `buildTablePrivilegesSql` query dynamically retrieves the schema and table names for given table OIDs and then executes a formatted privilege-related SQL command on each identified table. It is used to apply or check specific table privileges programmatically within the database.

```sql
do $$
    declare
      nspname name;
      relname name;
    begin
      for nspname, relname in
        select n.nspname, c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.oid in (${oids.join(', ')})
      loop
        execute format('${privilegeClause}', nspname, relname);
      end loop;
    end $$;
```

### buildFunctionPrivilegesSql

**Type:** metadata

**Tables touched:**
- pg_proc
- pg_namespace

**Purpose:**
This query dynamically iterates over specified stored functions by their schema and name, then executes a privilege-related SQL command (defined by `${privilegeClause}`) on each function using its identity argument signature. It’s used to grant, revoke, or check privileges on database functions in a flexible, programmatic way.

```sql
do $$
    declare
      nspname name;
      proname name;
      arg_types text;
    begin
      for nspname, proname, arg_types in
        select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where (n.nspname, p.proname) in (${tuples})
      loop
        execute format('${privilegeClause}', nspname, proname, arg_types);
      end loop;
    end $$;
```

### IGNORED_SCHEMAS

**Type:** unknown

**Tables touched:**
- table_privileges

**Purpose:**
This SQL query categorizes database tables' privilege statuses into three groups—'granted' when all three roles have all key privileges, 'revoked' when none of the roles have any privileges, and 'custom' for any other partial permission combinations—helping to identify schema access configurations efficiently.

```sql
: ''}
      group by c.oid, n.nspname, c.relname, c.relkind
    ),
    table_grants as (
      select
        id,
        schema_name,
        name,
        kind,
        case
          -- 1. Strict Granted: All 3 roles possess ALL 4 privileges
          when (
            anon_select and anon_insert and anon_update and anon_delete and
            auth_select and auth_insert and auth_update and auth_delete and
            srv_select and srv_insert and srv_update and srv_delete
          ) then 'granted'

          -- 2. Strict Revoked: NO role possesses ANY privilege
          when not (
            anon_select or anon_insert or anon_update or anon_delete or
            auth_select or auth_insert or auth_update or auth_delete or
            srv_select or srv_insert or srv_update or srv_delete
          ) then 'revoked'

          -- 3. Custom: Anything in between
          else 'custom'
        end as status
      from table_privileges
    )
```

### IGNORED_SCHEMAS

**Type:** unknown

**Tables touched:**
- function_privileges

**Purpose:**
This query categorizes functions in each schema based on their execution privileges for anonymous, authenticated, and server roles, labeling them as 'granted', 'revoked', or 'custom' to help identify access levels in ignored schemas. It supports auditing and managing function-level permissions in the database.

```sql
: ''}
      group by n.nspname, p.proname
    ),
    function_grants as (
      select
        schema_name,
        name,
        case
          when anon_execute and auth_execute and srv_execute then 'granted'
          when not (anon_execute or auth_execute or srv_execute) then 'revoked'
          else 'custom'
        end as status
      from function_privileges
    )
```

## data/storage/storage.sql.ts

### getLargestSizeLimitBucketsSqlUnoptimized

**Type:** read

**Tables touched:**
- storage.buckets

**Purpose:**
This query retrieves the IDs, names, and file size limits of storage buckets that have a defined file size limit, sorting them from largest to smallest limit and returning the top results plus one extra based on a given count parameter. It is used to identify the buckets with the highest file size restrictions, likely for monitoring or management purposes.

```sql
SELECT id, name, file_size_limit
FROM storage.buckets
WHERE file_size_limit IS NOT NULL
ORDER BY file_size_limit DESC
LIMIT ${LARGEST_SIZE_LIMIT_BUCKETS_COUNT + 1};
```

## data/table-rows/table-rows.sql.ts

### getTableRowsCountSql

**Type:** metadata

**Tables touched:**
- pg_class
- approximation

**Purpose:**
This query retrieves the row count for a specific table by either returning an exact count using a supplied SQL (`countBaseSql`) if the estimated row count is below a threshold, or returning -1 to indicate an approximate count when the estimate exceeds that threshold, flagging whether the count is an estimate. This helps optimize performance by avoiding expensive exact counts on very large tables.

```sql
with approximation as (
    select reltuples as estimate
    from pg_class
    where oid = ${table.id}
)
select 
  case 
    when estimate > ${THRESHOLD_COUNT} then (select -1)
    else (${countBaseSql})
  end as count,
  estimate > ${THRESHOLD_COUNT} as is_estimate
from approximation;
```

### getTableRowsCountSql

**Type:** metadata

**Tables touched:**
- pg_class

**Purpose:**
This SQL query estimates the row count of a specific database table using PostgreSQL's system catalog (pg_class) for a fast approximate count, and conditionally decides whether to rely on this estimate or perform a more precise count based on a threshold and applied filters. It helps optimize performance by avoiding expensive full table scans when dealing with large tables.

```sql
${COUNT_ESTIMATE_SQL}

with approximation as (
    select reltuples as estimate
    from pg_class
    where oid = ${table.id}
)
select 
  case 
    when estimate > ${THRESHOLD_COUNT} then ${filters.length > 0 ?
```
