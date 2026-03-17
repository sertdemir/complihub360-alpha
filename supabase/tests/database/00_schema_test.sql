begin;
select plan(7);

-- Verify extensions
select has_extension('vector', 'pgvector should be installed for RAG');
select has_extension('uuid-ossp', 'uuid-ossp should be installed for UUIDs');

-- Verify public tables exist
select has_table('users');
select has_table('providers');
select has_table('engagement_requests');
select has_table('event_log');
select has_table('knowledge_chunks');

select * from finish();
rollback;
