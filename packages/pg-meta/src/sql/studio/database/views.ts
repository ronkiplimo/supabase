import { literal, safeSql, type SafeSqlFragment } from '../../../pg-format'

export const getViewDefinitionSql = ({ id }: { id: number }): SafeSqlFragment => {
  if (!id) {
    throw new Error('id is required')
  }

  return safeSql`
    with table_info as (
      select
        n.nspname::text as schema,
        c.relname::text as name,
        to_regclass(concat('"', n.nspname, '"."', c.relname, '"')) as regclass
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where c.oid = ${literal(id)}
    )
    select pg_get_viewdef(t.regclass, true) as definition
    from table_info t
  `
}
