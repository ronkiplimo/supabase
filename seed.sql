\set ON_ERROR_STOP on

-- Load the project data dump after migrations create the schema.
\ir ../data.sql
