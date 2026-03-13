\set pguser `echo "$POSTGRES_USER"`

CREATE DATABASE project_meta WITH OWNER :pguser;
