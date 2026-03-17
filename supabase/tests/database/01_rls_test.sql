begin;
select plan(9);

-- Check if RLS is enabled on all core tables
select is((select relrowsecurity from pg_class where oid = 'public.users'::regclass), true, 'Users table should have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.providers'::regclass), true, 'Providers table should have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.engagement_requests'::regclass), true, 'Engagement requests should have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.event_log'::regclass), true, 'Event log should have RLS');
select is((select relrowsecurity from pg_class where oid = 'public.knowledge_chunks'::regclass), true, 'Knowledge chunks should have RLS');

-- Check specific policies exist
select policies_are(
    'public',
    'users',
    ARRAY[
        'Users can read own data',
        'Users can update own data'
    ],
    'users should only have policies allowing reading and updating own data'
);

select policies_are(
    'public',
    'providers',
    ARRAY[
        'Providers are globally readable',
        'Only Admins can update providers'
    ],
    'providers should be readable by all, writable by admins'
);

select policies_are(
    'public',
    'engagement_requests',
    ARRAY[
        'Users can read own requests',
        'Users can embed own requests'
    ],
    'engagement_requests should restrict users strictly to own data'
);

select policies_are(
    'public',
    'knowledge_chunks',
    ARRAY[
        'Knowledge Chunks are globally readable'
    ],
    'RAG chunks should be readable by all'
);

select * from finish();
rollback;
