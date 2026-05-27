-- =============================================================
-- Core Platform — CMS Database Export
-- =============================================================
-- Source: Replit PostgreSQL (heliumdb) — Development environment
-- Exported: 2026-04-08
-- Format: pg_dump with column-inserts (portable INSERT statements)
--
-- Table Row Counts:
--   cms_pages ............. 6 rows
--   cms_sections .......... 1 row
--   cms_media ............. 3 rows
--   cms_menus ............. 0 rows (empty)
--   seo_settings .......... 1 row
--   redirects ............. 1 row
--   cms_page_revisions .... 8 rows
--   TOTAL ................. 20 rows
--
-- Notes:
--   - All IDs and foreign keys preserved exactly
--   - Includes all rows regardless of status (draft, published, etc.)
--   - cms_menus table is empty (schema only)
--   - Foreign keys reference the 'users' table (created_by, updated_by, etc.)
--     Ensure the users table exists before importing, or drop FK constraints.
--   - To import: psql -d <your_db> -f cms-export.sql
-- =============================================================

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cms_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_media (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    filename text NOT NULL,
    original_name text NOT NULL,
    url text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    r2_key text,
    alt text,
    uploaded_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: cms_menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_menus (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location text DEFAULT 'unassigned'::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: cms_page_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_page_revisions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    page_id character varying NOT NULL,
    title text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL,
    changed_by character varying,
    change_note text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: cms_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_pages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    page_type text DEFAULT 'custom'::text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb,
    seo_title text,
    seo_description text,
    seo_keywords text,
    og_image_url text,
    created_by character varying,
    updated_by character varying,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    canonical_url text,
    noindex boolean DEFAULT false,
    scheduled_at timestamp without time zone
);


--
-- Name: cms_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_sections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text,
    blocks jsonb DEFAULT '[]'::jsonb NOT NULL,
    thumbnail_url text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: redirects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redirects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    from_path text NOT NULL,
    to_path text NOT NULL,
    status_code integer DEFAULT 301 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: seo_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    site_name text DEFAULT 'Core Platform'::text,
    title_suffix text DEFAULT ' | Core Platform'::text,
    default_meta_description text,
    site_url text,
    default_og_image_url text,
    organization_name text DEFAULT 'Core Platform'::text,
    organization_logo_url text,
    facebook_url text,
    twitter_handle text,
    linkedin_url text,
    instagram_url text,
    default_robots_noindex boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Data for Name: cms_media; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cms_media (id, filename, original_name, url, mime_type, file_size, r2_key, alt, uploaded_by, created_at) VALUES ('251d5da0-b845-4bef-afa7-c07b1e9941b8', '1774999543460-AdobeStock_966249845.jpeg', 'AdobeStock_966249845.jpeg', '/uploads/cms/1774999543460-AdobeStock_966249845.jpeg', 'image/jpeg', 3732469, NULL, '', '962991ba-8d93-4ced-8e13-cadb4ad48195', '2026-03-31 23:25:43.559094');
INSERT INTO public.cms_media (id, filename, original_name, url, mime_type, file_size, r2_key, alt, uploaded_by, created_at) VALUES ('8f2acd6c-d589-409b-b3e6-d7ccd8280a78', '1775005320805-AdobeStock_966249845.jpeg', 'AdobeStock_966249845.jpeg', '/uploads/cms/1775005320805-AdobeStock_966249845.jpeg', 'image/jpeg', 3732469, NULL, '', '962991ba-8d93-4ced-8e13-cadb4ad48195', '2026-04-01 01:02:00.813244');
INSERT INTO public.cms_media (id, filename, original_name, url, mime_type, file_size, r2_key, alt, uploaded_by, created_at) VALUES ('06555558-da0c-44bc-ac02-eff2bcf278e9', '1775599696501-1000_F_121064813_5CONOqmYSLyCLJlkRn3FsUl8733cg2qc.jpg', '1000_F_121064813_5CONOqmYSLyCLJlkRn3FsUl8733cg2qc.jpg', '/uploads/cms/1775599696501-1000_F_121064813_5CONOqmYSLyCLJlkRn3FsUl8733cg2qc.jpg', 'image/jpeg', 375510, NULL, '', '962991ba-8d93-4ced-8e13-cadb4ad48195', '2026-04-07 22:08:16.507098');


--
-- Data for Name: cms_menus; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: cms_page_revisions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('df9369e8-e0b8-4d1e-95f1-16dcd1638fec', '2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', '{}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Initial creation', '2026-03-11 01:29:40.422462');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('48610d26-5a53-46f0-beaf-5ba7669a9876', '2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', '{}', 'published', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Updated', '2026-03-11 01:41:01.351293');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('b8ae4a79-7a75-4a59-876e-8fe41fb091a4', '2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', '{"blocks": [{"id": "99a23442-ffc3-4216-8616-17bfbeb1e02e", "type": "section-header", "props": {"title": "Why Core Platform-Informed Care Matters", "eyebrow": "Our Approach", "subtitle": "We match you with counselors who understand the Core Platform experience.", "alignment": "center"}}, {"id": "783cfab6-0735-464a-bc19-117089a11ffb", "type": "hero", "props": {"ctaLink": "/directory", "ctaText": "Find a Counselor", "heading": "Welcome to Core Platform - About", "subheading": "Connecting Third Culture Kids with counselors who understand your world.", "overlayOpacity": 50, "ctaSecondaryLink": "/about", "ctaSecondaryText": "Learn More", "backgroundImageUrl": ""}}]}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Updated', '2026-03-11 02:23:41.079171');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('4980d0f9-5126-43bc-9a95-d77dbf3e5107', '2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', '{"blocks": [{"id": "99a23442-ffc3-4216-8616-17bfbeb1e02e", "type": "section-header", "props": {"title": "Why Core Platform-Informed Care Matters", "eyebrow": "Our Approach", "subtitle": "We match you with counselors who understand the Core Platform experience.", "alignment": "center"}}, {"id": "783cfab6-0735-464a-bc19-117089a11ffb", "type": "hero", "props": {"ctaLink": "/directory", "ctaText": "Find a Counselor", "heading": "Welcome to Core Platform - About", "subheading": "Connecting Third Culture Kids with counselors who understand your world.", "overlayOpacity": 50, "ctaSecondaryLink": "/about", "ctaSecondaryText": "Learn More", "backgroundImageUrl": ""}}]}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Before restore', '2026-03-11 02:23:48.461008');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('c27d64f2-9424-4bd3-8dfb-487873dd6e2c', '2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', '{}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Restored from revision', '2026-03-11 02:23:48.46866');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('45da8de4-b358-4627-b90b-2cfacdac7cda', '2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', '{}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Updated', '2026-03-11 02:27:41.004116');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('274bd782-96a4-4efe-9bf9-8ff606ed29bc', '956120c1-2224-460c-9457-6929f1227cbc', 'EOD QA Test Page', '{"blocks": []}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Initial creation', '2026-03-11 02:35:26.228786');
INSERT INTO public.cms_page_revisions (id, page_id, title, content, status, changed_by, change_note, created_at) VALUES ('1cbfdb9f-0d7d-4d33-a956-feb82b8b5f28', '956120c1-2224-460c-9457-6929f1227cbc', 'EOD QA Test Page', '{"blocks": []}', 'draft', '962991ba-8d93-4ced-8e13-cadb4ad48195', 'Updated', '2026-03-11 02:36:33.53167');


--
-- Data for Name: cms_pages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cms_pages (id, title, slug, status, page_type, content, seo_title, seo_description, seo_keywords, og_image_url, created_by, updated_by, published_at, created_at, updated_at, canonical_url, noindex, scheduled_at) VALUES ('956120c1-2224-460c-9457-6929f1227cbc', 'EOD QA Test Page', 'eod-qa-test-page', 'draft', 'custom', '{"blocks": [{"id": "e776b879-a00d-4ccf-90e4-77c322ea6ddd", "type": "hero", "props": {"ctaLink": "/directory", "ctaText": "Find a Counselor", "heading": "Welcome to Core Platform", "subheading": "Connecting Third Culture Kids with counselors who understand your world.", "overlayOpacity": 50, "ctaSecondaryLink": "/about", "ctaSecondaryText": "Learn More", "backgroundImageUrl": ""}}]}', '', '', '', '', '962991ba-8d93-4ced-8e13-cadb4ad48195', '962991ba-8d93-4ced-8e13-cadb4ad48195', NULL, '2026-03-11 02:35:26.223179', '2026-03-11 02:36:46.451', NULL, false, NULL);
INSERT INTO public.cms_pages (id, title, slug, status, page_type, content, seo_title, seo_description, seo_keywords, og_image_url, created_by, updated_by, published_at, created_at, updated_at, canonical_url, noindex, scheduled_at) VALUES ('2d6ed55e-e439-4839-9e4c-80d0c29699c1', 'About Core Platform', 'about-corePlatform-wellness', 'draft', 'custom', '{"blocks": []}', '', '', '', '', '962991ba-8d93-4ced-8e13-cadb4ad48195', '962991ba-8d93-4ced-8e13-cadb4ad48195', NULL, '2026-03-11 01:29:40.418257', '2026-03-11 02:27:41.007', NULL, false, NULL);
INSERT INTO public.cms_pages (id, title, slug, status, page_type, content, seo_title, seo_description, seo_keywords, og_image_url, created_by, updated_by, published_at, created_at, updated_at, canonical_url, noindex, scheduled_at) VALUES ('f22d5d38-14fc-46e4-bdcf-8f028eae460b', 'About', 'about', 'published', 'about', '{"blocks": [{"id": "20c20ba9-551d-4ea5-be06-a3fce97a3d22", "type": "section-header", "props": {"title": "History", "eyebrow": "OUR STORY", "alignment": "left"}}, {"id": "3824c517-d0b7-463f-9670-af50637eca62", "type": "rich-text", "props": {"content": "<p>Core Platform was born from the lived experience of growing up between cultures. Our founders — Adult Core Platforms and mental health advocates — experienced firsthand how difficult it is to find a mental health professional who truly understands what it means to call multiple countries \"home.\" In 2024, they set out to build a bridge between Third Culture Kids and the culturally competent professionals who serve them.</p>", "alignment": "left"}}, {"id": "a292f156-333d-4e2f-9785-6e09a8546676", "type": "section-header", "props": {"title": "Vision & Mission", "eyebrow": "WHAT WE STAND FOR", "alignment": "left"}}, {"id": "c7c1a272-1a4c-4e91-a5d2-83dd7016f750", "type": "rich-text", "props": {"content": "<p>Our vision is a world where every Third Culture Kid has access to mental health support that honors their multicultural identity. Our mission is to build the most trusted directory of Core Platform-informed mental health professionals — vetted, accessible, and global — so that no one has to navigate the complexities of cross-cultural life alone.</p>", "alignment": "left"}}, {"id": "f5d90eed-90fe-4625-8efd-6cd25b9bbb40", "type": "section-header", "props": {"title": "The Stats Speak for Themselves", "eyebrow": "THE RESEARCH", "subtitle": "According to Core Platform Training''s 2024 research, survey of 1600+ adult Core Platforms:", "alignment": "center"}}, {"id": "52619295-f79d-4532-a115-402675d51320", "type": "cards-grid", "props": {"cards": [{"icon": "AlertCircle", "title": "60% of Core Platforms", "description": "experienced symptoms of anxiety related to their cross-cultural upbringing and transitions."}, {"icon": "AlertCircle", "title": "59% of Core Platforms", "description": "experienced symptoms of depression, often connected to unresolved grief of place and identity."}, {"icon": "AlertCircle", "title": "47% of Core Platforms", "description": "experienced symptoms of suicidal ideation at some point in their lives."}], "columns": "3"}}, {"id": "098a923f-53de-45de-9eec-0f4510984a1d", "type": "rich-text", "props": {"content": "<p>However, significantly smaller numbers get diagnosed. While we can only speculate on why, due to our decades of observations and expertise in the field, we think a large reason is due to lack of accessibility to proper mental health services. <strong>Which is a major driver in why we do what we do!</strong></p>", "alignment": "center"}}, {"id": "5a8e16c1-0bca-4dbf-a135-b608a1365880", "type": "section-header", "props": {"title": "Why Core Platform Informed?", "eyebrow": "WHY IT MATTERS", "alignment": "left"}}, {"id": "681b3e5c-a703-4ba3-852f-0db93779667c", "type": "rich-text", "props": {"content": "<p>Traditional therapy models were developed within a single cultural framework. When Core Platforms bring their experiences to these frameworks, important aspects of their story can be misunderstood or pathologized. A Core Platform-informed mental health professional understands concepts like ambiguous loss, hidden immigrants, cultural marginality, and grief of place. They recognize that growing up across cultures creates both remarkable strengths and unique challenges — and they know how to work with both.</p>", "alignment": "left"}}, {"id": "8efef5a4-bdf0-4ec3-8a0a-81f411bd528a", "type": "section-header", "props": {"title": "What Our Vetting Process Means — and Doesn''t Mean", "eyebrow": "OUR VETTING", "subtitle": "We take our responsibility to both mental health professionals and clients seriously. Here''s what you can expect from our process.", "alignment": "center"}}, {"id": "8ccabd06-d1ba-4899-b0e6-5ba9ed48e9ae", "type": "rich-text", "props": {"content": "<div>\n<h3>What vetting means:</h3>\n<ul>\n<li>Every mental health professional completes a detailed application process</li>\n<li>Credentials and licensure are verified</li>\n<li>Training or lived experience with Core Platform/cross-cultural populations is required</li>\n<li>Profiles are reviewed by our team before being published</li>\n</ul>\n<h3>What vetting does not mean:</h3>\n<ul>\n<li>We are not a licensing or credentialing body</li>\n<li>We do not provide clinical supervision</li>\n<li>Listing does not constitute an endorsement of specific therapeutic outcomes</li>\n<li>We do not guarantee a therapeutic match — but we make finding one easier</li>\n</ul>\n</div>", "alignment": "left"}}, {"id": "8f7220bb-3af0-4f2c-a416-75711cdf84b1", "type": "testimonials", "props": {"items": [{"name": "Sarah M.", "role": "Adult Core Platform", "quote": "For the first time, I didn''t have to explain what it means to grow up between cultures. My mental health professional just understood.", "location": "Singapore", "avatarUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces"}, {"name": "James K.", "role": "Expat Parent", "quote": "Core Platform connected me with a mental health professional who speaks my language — literally and figuratively. It''s been life-changing.", "location": "Dubai", "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"}, {"name": "Dr. Amara O.", "role": "Licensed Mental Health Professional", "quote": "As a mental health professional, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.", "location": "Nairobi", "avatarUrl": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces"}, {"name": "Lena T.", "role": "Core Platform & College Student", "quote": "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.", "location": "Germany", "avatarUrl": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces"}, {"name": "Marcus W.", "role": "Military Core Platform", "quote": "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.", "location": "Virginia, USA", "avatarUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces"}, {"name": "Priya D.", "role": "Cross-Cultural Professional", "quote": "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time in therapy.", "location": "London", "avatarUrl": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces"}], "title": "What Are People Saying?"}}, {"id": "1c2cf8ec-60b7-4639-bc78-ac2b928a0846", "type": "blog-preview", "props": {"limit": 3, "title": "Featured On", "subtitle": ""}}, {"id": "87bb9c3e-7c2e-47ea-99ef-d2f9b3377ea6", "type": "section-header", "props": {"title": "FAQs", "alignment": "center"}}, {"id": "3e7d0ce2-2be3-4aa7-b7ab-64d662b48bc6", "type": "faq", "props": {"items": [{"answer": "A Third Culture Kid (Core Platform) is a person who has spent a significant part of their developmental years outside their parents'' culture. They build relationships with multiple cultures while not having full ownership of any, creating what is often called a ''third culture'' — a blend of their passport country and host countries.", "question": "What is a Third Culture Kid (Core Platform)?"}, {"answer": "Core Platform is for anyone who has had a cross-cultural upbringing or is navigating globally-mobile life: Core Platforms of all ages, expat families, international students, military families, missionary kids, diplomats'' children, and cross-cultural professionals.", "question": "Who can use Core Platform to find a mental health professional?"}, {"answer": "Every mental health professional completes an application process, provides verified credentials, and must demonstrate training or lived experience with Core Platform and cross-cultural populations. Our team reviews each profile before it goes live in the directory.", "question": "How are mental health professionals vetted before joining the directory?"}, {"answer": "No. Core Platform is a directory and community platform. We connect individuals with qualified mental health professionals — we do not provide therapy directly. All therapeutic relationships are between clients and their chosen mental health professionals.", "question": "Is Core Platform a therapy service?"}, {"answer": "Yes. Our mental health professionals serve clients globally, with many offering online/telehealth sessions. Use the location and online session filters in the directory to find mental health professionals who can work with you wherever you are.", "question": "Can I use the directory if I live outside the United States?"}, {"answer": "You can support us by sharing the platform with Core Platforms and expat communities, following us on social media, attending our events, or if you''re a mental health professional — joining our network.", "question": "How can I support Core Platform?"}]}}, {"id": "54eced69-65ff-427b-97a2-31dccfe658a6", "type": "cta", "props": {"heading": "Donate to Core Platform", "variant": "accent", "subheading": "Your support helps us maintain this platform, expand our directory, and provide resources to the global Core Platform community. Every contribution — large or small — makes a difference in connecting Core Platforms with the care they deserve.", "primaryLink": "/donate", "primaryText": "Donate"}}]}', 'About Core Platform', 'Learn about Core Platform, our mission to support Third Culture Kids, and how we vet mental health professionals for cross-cultural competency.', '', '', NULL, '962991ba-8d93-4ced-8e13-cadb4ad48195', '2026-04-01 01:30:45.765', '2026-03-11 01:57:13.407433', '2026-04-01 01:30:45.765', NULL, false, NULL);
INSERT INTO public.cms_pages (id, title, slug, status, page_type, content, seo_title, seo_description, seo_keywords, og_image_url, created_by, updated_by, published_at, created_at, updated_at, canonical_url, noindex, scheduled_at) VALUES ('fa998647-7619-4e95-9818-d61d5223f98d', 'Contact', 'contact', 'published', 'contact', '{"blocks": [{"id": "90e15ce3-f2af-473f-8945-57080fe6008d", "type": "section-header", "props": {"title": "Contact Us", "eyebrow": "GET IN TOUCH", "subtitle": "Have a question or feedback? We''d love to hear from you.", "alignment": "center"}}, {"id": "4f94f296-39e1-40fc-8ca2-380fe89d271f", "type": "contact-form", "props": {}}]}', 'Contact Core Platform', 'Get in touch with the Core Platform team. We''re here to help you find the right mental health professional or answer questions about our platform.', '', '', NULL, NULL, '2026-04-01 01:30:45.772', '2026-03-11 01:57:13.413846', '2026-04-01 01:30:45.772', NULL, false, NULL);
INSERT INTO public.cms_pages (id, title, slug, status, page_type, content, seo_title, seo_description, seo_keywords, og_image_url, created_by, updated_by, published_at, created_at, updated_at, canonical_url, noindex, scheduled_at) VALUES ('9df13256-4a68-499d-a8bc-73555bcb4bf6', 'Join as a Counselor', 'join', 'published', 'custom', '{"blocks": [{"id": "66d4aa41-5717-4419-8f29-4a967e19f8f7", "type": "join-registration-form", "props": {}}, {"id": "90950c38-638a-4291-8d59-399b391f0a67", "type": "section-header", "props": {"title": "What Does Membership Include?", "alignment": "center"}}, {"id": "f811f7b6-d897-4678-a777-c2ac09cd7456", "type": "cards-grid", "props": {"cards": [{"icon": "ClipboardCheck", "title": "Directory Listing", "description": "Get a professional profile in our searchable directory, visible to Core Platforms and cross-cultural families seeking specialized support worldwide."}, {"icon": "Users", "title": "Client Connections", "description": "Receive referrals from individuals actively searching for Core Platform-informed mental health professionals who understand their experience."}, {"icon": "BarChart3", "title": "Profile Analytics", "description": "Track how many people view your profile, where they''re located, and which specializations attract the most interest."}, {"icon": "Star", "title": "Community Access", "description": "Join a network of Core Platform-informed professionals for peer consultation, shared resources, and community events."}], "columns": "4"}}, {"id": "d208da0e-4b31-4f86-8c00-f40c20781d2d", "type": "section-header", "props": {"title": "The Application Process", "alignment": "center"}}, {"id": "266b8027-1fe5-4f5f-8fc1-4ae59e0b8097", "type": "cards-grid", "props": {"cards": [{"icon": "ClipboardCheck", "title": "1. Submit Your Application", "description": "Complete our online application with your credentials, areas of specialization, and experience working with Core Platform or cross-cultural populations."}, {"icon": "CheckCircle", "title": "2. Credential Verification", "description": "Our team verifies your licensure, certifications, and professional standing to ensure quality and trust for our community."}, {"icon": "Search", "title": "3. Core Platform Competency Review", "description": "We assess your training and lived experience with Core Platform, expat, and cross-cultural clients to confirm a strong fit for our directory."}, {"icon": "User", "title": "4. Profile Setup", "description": "Build your professional profile with your bio, specializations, languages, session formats, and availability for prospective clients."}, {"icon": "Star", "title": "5. Go Live in the Directory", "description": "Once approved, your profile goes live and you begin receiving visibility from Core Platforms and families searching for support."}], "columns": "3"}}, {"id": "24005d9d-7c7b-4238-a9df-d4669db7e71f", "type": "cta", "props": {"heading": "Interested in Training but Not a Member?", "variant": "light", "subheading": "We offer Core Platform-informed training programs for mental health professionals who want to deepen their cross-cultural competency. Whether you''re just beginning to explore the Core Platform space or want to sharpen your skills, our training equips you with the frameworks and lived-experience insights to better serve globally-mobile clients.", "primaryLink": "/training", "primaryText": "Learn More"}}]}', 'Join the Core Platform Mental Health Professional Network', 'Apply to join the Core Platform mental health professional network. Reach Core Platforms and cross-cultural families who need your specialized expertise.', '', '', NULL, NULL, '2026-04-01 01:30:45.778', '2026-03-11 01:57:13.42727', '2026-04-01 01:30:45.778', NULL, false, NULL);
INSERT INTO public.cms_pages (id, title, slug, status, page_type, content, seo_title, seo_description, seo_keywords, og_image_url, created_by, updated_by, published_at, created_at, updated_at, canonical_url, noindex, scheduled_at) VALUES ('465442fd-a56d-4276-82a6-e9e3ebbdf2bb', 'Home', 'home', 'published', 'home', '{"blocks": [{"id": "ee822535-88bb-49d0-a3be-6979bc9670c8", "type": "hero", "props": {"ctaLink": "/directory", "ctaText": "Find a Mental Health Professional!", "heading": "Care that understands where Core Platforms \"come from\".", "subheading": "", "overlayOpacity": 85, "ctaSecondaryLink": "/join", "ctaSecondaryText": "Applications open in June.", "backgroundImageUrl": "/images/hero-therapy-session.png"}}, {"id": "cff20882-226b-48f4-a88c-9e3812a3ba9f", "type": "cards-grid", "props": {"cards": [{"icon": "Globe", "title": "Culturally Informed Care", "description": "Every mental health professional in our directory understands the unique challenges of growing up across cultures."}, {"icon": "Heart", "title": "Specialized Support", "description": "Find professionals trained in identity, belonging, grief of place, and cross-cultural transitions."}, {"icon": "Users", "title": "Global Community", "description": "Join a community that celebrates the richness of a multicultural upbringing."}], "title": "Why Core Platform Informed?", "columns": "3", "subtitle": "We bridge the gap between Third Culture Kids and culturally competent mental health professionals."}}, {"id": "ac0a69e9-a247-425f-9fd3-8089870cff0e", "type": "section-header", "props": {"title": "Is Counseling What''s Needed?", "alignment": "center"}}, {"id": "0f0f932e-cfa4-4bd6-9af6-e24bed011655", "type": "rich-text", "props": {"content": "<p>Not every challenge requires a clinical diagnosis or therapy. Sometimes what Core Platforms need most is validation, community, or practical guidance for navigating transitions. Our directory includes a range of professionals — from licensed therapists to certified coaches and peer support specialists — so you can find the right kind of support for wherever you are in your journey.</p>", "alignment": "center"}}, {"id": "346a9d4f-147f-426e-9670-3419f9762bb1", "type": "testimonials", "props": {"items": [{"name": "Sarah M.", "role": "Adult Core Platform", "quote": "For the first time, I didn''t have to explain what it means to grow up between cultures. My mental health professional just understood.", "location": "Singapore", "avatarUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces"}, {"name": "James K.", "role": "Expat Parent", "quote": "Core Platform connected me with a mental health professional who speaks my language — literally and figuratively. It''s been life-changing.", "location": "Dubai", "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces"}, {"name": "Dr. Amara O.", "role": "Licensed Mental Health Professional", "quote": "As a mental health professional, this platform lets me reach the exact community I trained to serve. The directory is beautifully done.", "location": "Nairobi", "avatarUrl": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=faces"}, {"name": "Lena T.", "role": "Core Platform & College Student", "quote": "I struggled for years to find someone who understood repatriation grief. Core Platform made it possible in minutes.", "location": "Germany", "avatarUrl": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces"}, {"name": "Marcus W.", "role": "Military Core Platform", "quote": "The specialization filters helped me find a mental health professional experienced with military kid transitions. Highly recommend.", "location": "Virginia, USA", "avatarUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces"}, {"name": "Priya D.", "role": "Cross-Cultural Professional", "quote": "Finally, a platform that recognizes our unique needs. I feel seen and supported for the first time in therapy.", "location": "London", "avatarUrl": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces"}], "title": "What People Are Saying"}}, {"id": "99d914d0-eb34-41b3-b8f0-5c8b758277cd", "type": "therapist-map", "props": {"title": "Our Mental Health Professionals Around the World", "subtitle": "Click a pin to learn more about a Core Platform-informed professional near you"}}, {"id": "dd9fd7e7-586f-48a2-91f7-9dca550fa0d7", "type": "events-preview", "props": {"limit": 3, "title": "Upcoming Events", "subtitle": "Join our community events for Core Platforms and mental health professionals."}}, {"id": "03830454-fb8c-4730-a0b2-64299d825d7b", "type": "blog-preview", "props": {"limit": 6, "title": "Featured Articles", "subtitle": "Latest insights on Core Platform mental health and cross-cultural wellness."}}, {"id": "2ae664b8-002d-4cb9-9935-c902b11ef474", "type": "cta", "props": {"heading": "Are You a Core Platform-Informed Mental Health Professional?", "variant": "accent", "subheading": "Join our growing directory and connect with clients who need your unique expertise. List your practice and reach the global Core Platform community.", "primaryLink": "/auth/register", "primaryText": "Join the Directory"}}]}', 'Core Platform — Mental Health Support for Third Culture Kids', 'Find a mental health professional who understands your cross-cultural experience. Core Platform connects Third Culture Kids, expats, and globally-mobile families with specialized mental health professionals.', '', '', NULL, NULL, '2026-04-01 01:30:45.756', '2026-03-11 01:57:13.379957', '2026-04-01 01:30:45.756', NULL, false, NULL);


--
-- Data for Name: cms_sections; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.cms_sections (id, name, description, category, blocks, thumbnail_url, created_by, created_at, updated_at) VALUES ('4f2334fa-1eea-477f-9b7f-4f367c2b84d4', 'Builder Save Test', '', 'general', '[{"id": "c766d336-07c7-4739-93c9-3cc79a8e9ab2", "type": "hero", "props": {"ctaLink": "/directory", "ctaText": "Find a Counselor", "heading": "Counseling for Those Who''ve Called Many Places Home", "minHeight": "large", "textAlign": "center", "subheading": "Core Platform connects Third Culture Kids, expats, and globally-mobile families with counselors who truly understand their experience.", "overlayOpacity": 50, "ctaSecondaryLink": "/join", "ctaSecondaryText": "Join as a Counselor", "backgroundImageUrl": ""}}]', NULL, '962991ba-8d93-4ced-8e13-cadb4ad48195', '2026-03-11 02:10:56.883293', '2026-03-11 02:10:56.883293');


--
-- Data for Name: redirects; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.redirects (id, from_path, to_path, status_code, is_active, note, created_at, updated_at) VALUES ('e6400211-55e8-42d8-a26f-77e8552eee7a', '/old-test-path', '/insights', 301, true, '', '2026-03-11 05:58:47.764101', '2026-03-11 05:58:47.764101');


--
-- Data for Name: seo_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.seo_settings (id, site_name, title_suffix, default_meta_description, site_url, default_og_image_url, organization_name, organization_logo_url, facebook_url, twitter_handle, linkedin_url, instagram_url, default_robots_noindex, updated_at) VALUES ('global', 'Core Platform', ' | Core Platform', 'Core Platform connects Third Culture Kids with culturally informed counselors worldwide.', 'https://coreplatform.org', '', 'Core Platform', '', 'https://facebook.com/coreplatform', '@coreplatform', '', '', false, '2026-03-11 04:59:55.919');


--
-- Name: cms_media cms_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_pkey PRIMARY KEY (id);


--
-- Name: cms_menus cms_menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_menus
    ADD CONSTRAINT cms_menus_pkey PRIMARY KEY (id);


--
-- Name: cms_page_revisions cms_page_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_page_revisions
    ADD CONSTRAINT cms_page_revisions_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_pkey PRIMARY KEY (id);


--
-- Name: cms_sections cms_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_sections
    ADD CONSTRAINT cms_sections_pkey PRIMARY KEY (id);


--
-- Name: redirects redirects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redirects
    ADD CONSTRAINT redirects_pkey PRIMARY KEY (id);


--
-- Name: seo_settings seo_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_settings
    ADD CONSTRAINT seo_settings_pkey PRIMARY KEY (id);


--
-- Name: idx_cms_media_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_media_created_at ON public.cms_media USING btree (created_at);


--
-- Name: idx_cms_page_revisions_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_page_revisions_page_id ON public.cms_page_revisions USING btree (page_id);


--
-- Name: idx_cms_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cms_pages_slug ON public.cms_pages USING btree (slug);


--
-- Name: idx_cms_pages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_pages_status ON public.cms_pages USING btree (status);


--
-- Name: idx_cms_sections_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_sections_category ON public.cms_sections USING btree (category);


--
-- Name: idx_cms_sections_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_sections_created_at ON public.cms_sections USING btree (created_at);


--
-- Name: cms_media cms_media_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_media
    ADD CONSTRAINT cms_media_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cms_page_revisions cms_page_revisions_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_page_revisions
    ADD CONSTRAINT cms_page_revisions_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cms_page_revisions cms_page_revisions_page_id_cms_pages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_page_revisions
    ADD CONSTRAINT cms_page_revisions_page_id_cms_pages_id_fk FOREIGN KEY (page_id) REFERENCES public.cms_pages(id) ON DELETE CASCADE;


--
-- Name: cms_pages cms_pages_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cms_pages cms_pages_updated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_pages
    ADD CONSTRAINT cms_pages_updated_by_users_id_fk FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cms_sections cms_sections_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_sections
    ADD CONSTRAINT cms_sections_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

