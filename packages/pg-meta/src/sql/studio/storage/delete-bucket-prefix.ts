export const getDeleteBucketPrefixSQL = ({
  bucketId,
  prefix,
}: {
  bucketId: string
  prefix: string
}) => {
  const sql = /* SQL */ `
-- source: dashboard
-- description: Delete all storage objects matching a prefix within a bucket
select storage.delete_prefix('${bucketId}', '${prefix}');
`.trim()
  return sql
}
