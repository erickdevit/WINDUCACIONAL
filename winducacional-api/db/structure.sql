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
-- Name: app_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_metadata (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    attendance_date date NOT NULL,
    first_login_at timestamp with time zone,
    last_login_at timestamp with time zone,
    login_count integer DEFAULT 1 NOT NULL,
    source text DEFAULT 'login'::text NOT NULL,
    turma_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_source_check CHECK ((source = ANY (ARRAY['login'::text, 'manual'::text])))
);


--
-- Name: booklet_module_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booklet_module_access (
    module_id text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booklet_student_module_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booklet_student_module_access (
    module_id text NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    thread_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    attachment jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_threads (
    id uuid NOT NULL,
    type text DEFAULT 'dm'::text NOT NULL,
    turma_id uuid,
    user_a uuid,
    user_b uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_threads_type_check CHECK ((type = ANY (ARRAY['dm'::text, 'group'::text])))
);


--
-- Name: exam_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_answers (
    id uuid NOT NULL,
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text,
    is_correct boolean,
    points_awarded numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_application_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_application_batches (
    id uuid NOT NULL,
    applied_by uuid,
    mode text DEFAULT 'all'::text NOT NULL,
    total_requested integer DEFAULT 0 NOT NULL,
    total_created integer DEFAULT 0 NOT NULL,
    total_existing integer DEFAULT 0 NOT NULL,
    total_skipped integer DEFAULT 0 NOT NULL,
    total_removed integer DEFAULT 0 NOT NULL,
    total_retained integer DEFAULT 0 NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancellation_reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_application_batches_mode_check CHECK ((mode = ANY (ARRAY['all'::text, 'balanced'::text])))
);


--
-- Name: exam_application_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_application_items (
    id uuid NOT NULL,
    batch_id uuid NOT NULL,
    exam_id uuid,
    user_id uuid,
    status text NOT NULL,
    removal_status text DEFAULT 'active'::text NOT NULL,
    removal_reason text DEFAULT ''::text NOT NULL,
    removed_at timestamp with time zone,
    reason text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_application_items_removal_status_check CHECK ((removal_status = ANY (ARRAY['active'::text, 'removed'::text, 'retained'::text]))),
    CONSTRAINT exam_application_items_status_check CHECK ((status = ANY (ARRAY['created'::text, 'existing'::text, 'skipped'::text])))
);


--
-- Name: exam_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_assignments (
    id uuid NOT NULL,
    exam_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_questions (
    id uuid NOT NULL,
    exam_id uuid NOT NULL,
    type text NOT NULL,
    text text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb,
    correct_answer text,
    validation_rules jsonb DEFAULT '[]'::jsonb,
    points integer DEFAULT 1 NOT NULL,
    time_limit integer DEFAULT 0 NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_questions_type_check CHECK ((type = ANY (ARRAY['mcq'::text, 'practical'::text])))
);


--
-- Name: exam_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_submissions (
    id uuid NOT NULL,
    exam_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    score_mcq numeric DEFAULT 0,
    score_practical numeric DEFAULT 0,
    total_score numeric DEFAULT 0,
    student_display_name text DEFAULT ''::text NOT NULL,
    practical_snapshot jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT exam_submissions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text])))
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid NOT NULL,
    turma_id uuid,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    container_initial_state jsonb DEFAULT '{}'::jsonb,
    time_limit integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: turmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turmas (
    id uuid NOT NULL,
    nome text NOT NULL,
    code text NOT NULL,
    student_type text DEFAULT 'normal'::text NOT NULL,
    schedule_days smallint[] DEFAULT ARRAY[(1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint] NOT NULL,
    schedule_start_time time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    schedule_end_time time without time zone DEFAULT '23:59:00'::time without time zone NOT NULL,
    descricao text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT turmas_code_format_check CHECK ((code ~ '^[A-Z0-9]{6}$'::text)),
    CONSTRAINT turmas_schedule_days_check CHECK (((COALESCE(array_length(schedule_days, 1), 0) > 0) AND (schedule_days <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint]))),
    CONSTRAINT turmas_schedule_time_check CHECK ((schedule_start_time < schedule_end_time)),
    CONSTRAINT turmas_student_type_check CHECK ((student_type = ANY (ARRAY['kids'::text, 'normal'::text, 'reposicao'::text])))
);


--
-- Name: typing_game_ranking; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.typing_game_ranking AS
SELECT
    NULL::uuid AS user_id,
    NULL::text AS name,
    NULL::text AS role,
    NULL::text AS student_type,
    NULL::uuid AS turma_id,
    NULL::bigint AS missions_completed,
    NULL::bigint AS points,
    NULL::integer AS best_wpm,
    NULL::numeric AS best_accuracy,
    NULL::integer AS best_time;


--
-- Name: typing_game_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_game_scores (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    mission_id text NOT NULL,
    mission_title text NOT NULL,
    score integer NOT NULL,
    wpm integer NOT NULL,
    accuracy numeric NOT NULL,
    hits integer DEFAULT 0 NOT NULL,
    errors integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'lost'::text NOT NULL,
    time_ms integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT typing_game_scores_status_check CHECK ((status = ANY (ARRAY['won'::text, 'lost'::text])))
);


--
-- Name: typing_game_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_game_settings (
    student_type text NOT NULL,
    pass_min_wpm integer DEFAULT 40 NOT NULL,
    pass_min_accuracy integer DEFAULT 95 NOT NULL,
    max_lives integer DEFAULT 7 NOT NULL,
    game_speed integer DEFAULT 100 NOT NULL,
    game_speed_boost integer DEFAULT 3 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT typing_game_settings_game_speed_boost_check CHECK (((game_speed_boost >= 0) AND (game_speed_boost <= 100))),
    CONSTRAINT typing_game_settings_game_speed_check CHECK (((game_speed >= 0) AND (game_speed <= 100))),
    CONSTRAINT typing_game_settings_max_lives_check CHECK (((max_lives >= 3) AND (max_lives <= 10))),
    CONSTRAINT typing_game_settings_pass_min_accuracy_check CHECK (((pass_min_accuracy >= 50) AND (pass_min_accuracy <= 100))),
    CONSTRAINT typing_game_settings_pass_min_wpm_check CHECK (((pass_min_wpm >= 10) AND (pass_min_wpm <= 120))),
    CONSTRAINT typing_game_settings_student_type_check CHECK ((student_type = ANY (ARRAY['kids'::text, 'normal'::text])))
);


--
-- Name: typing_pvp_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_pvp_matches (
    id uuid NOT NULL,
    winner_id uuid,
    loser_id uuid,
    winner_score integer DEFAULT 0,
    loser_score integer DEFAULT 0,
    turma_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: typing_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_scores (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    lesson_id integer NOT NULL,
    wpm integer NOT NULL,
    accuracy numeric NOT NULL,
    time_ms integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: typing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_settings (
    student_type text NOT NULL,
    pass_min_wpm integer DEFAULT 40 NOT NULL,
    pass_min_accuracy integer DEFAULT 95 NOT NULL,
    max_errors integer DEFAULT 7 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT typing_settings_max_errors_check CHECK (((max_errors >= 3) AND (max_errors <= 10))),
    CONSTRAINT typing_settings_pass_min_accuracy_check CHECK (((pass_min_accuracy >= 50) AND (pass_min_accuracy <= 100))),
    CONSTRAINT typing_settings_pass_min_wpm_check CHECK (((pass_min_wpm >= 10) AND (pass_min_wpm <= 120))),
    CONSTRAINT typing_settings_student_type_check CHECK ((student_type = ANY (ARRAY['kids'::text, 'normal'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    role text NOT NULL,
    student_type text DEFAULT 'normal'::text NOT NULL,
    password_salt text NOT NULL,
    password_hash text NOT NULL,
    storage_key text NOT NULL,
    turma_id uuid,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    bcrypt_hash character varying,
    legacy_auth_migrated_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['aluno'::text, 'professor'::text, 'secretaria'::text]))),
    CONSTRAINT users_student_type_check CHECK ((student_type = ANY (ARRAY['kids'::text, 'normal'::text])))
);


--
-- Name: typing_ranking; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.typing_ranking AS
 SELECT u.id AS user_id,
    u.username AS name,
    u.role,
    COALESCE(turma.student_type, u.student_type) AS student_type,
    u.turma_id,
    count(DISTINCT t.lesson_id) AS lessons_completed,
    (count(DISTINCT t.lesson_id) * 10) AS points,
    max(t.wpm) AS best_wpm,
    max(t.accuracy) AS best_accuracy,
    min(t.time_ms) AS best_time
   FROM (((public.users u
     LEFT JOIN public.turmas turma ON ((turma.id = u.turma_id)))
     LEFT JOIN public.typing_settings s ON ((s.student_type = COALESCE(turma.student_type, u.student_type))))
     LEFT JOIN public.typing_scores t ON (((t.user_id = u.id) AND (t.accuracy >= (COALESCE(s.pass_min_accuracy, 95))::numeric) AND (t.wpm >= COALESCE(s.pass_min_wpm, 40)))))
  WHERE ((u.role = 'aluno'::text) AND (u.active = true))
  GROUP BY u.id, u.username, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;


--
-- Name: app_metadata app_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_metadata
    ADD CONSTRAINT app_metadata_pkey PRIMARY KEY (key);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_user_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_attendance_date_key UNIQUE (user_id, attendance_date);


--
-- Name: booklet_module_access booklet_module_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booklet_module_access
    ADD CONSTRAINT booklet_module_access_pkey PRIMARY KEY (module_id);


--
-- Name: booklet_student_module_access booklet_student_module_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booklet_student_module_access
    ADD CONSTRAINT booklet_student_module_access_pkey PRIMARY KEY (module_id, user_id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_threads chat_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_pkey PRIMARY KEY (id);


--
-- Name: exam_answers exam_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers
    ADD CONSTRAINT exam_answers_pkey PRIMARY KEY (id);


--
-- Name: exam_answers exam_answers_submission_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers
    ADD CONSTRAINT exam_answers_submission_id_question_id_key UNIQUE (submission_id, question_id);


--
-- Name: exam_application_batches exam_application_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_batches
    ADD CONSTRAINT exam_application_batches_pkey PRIMARY KEY (id);


--
-- Name: exam_application_items exam_application_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_items
    ADD CONSTRAINT exam_application_items_pkey PRIMARY KEY (id);


--
-- Name: exam_assignments exam_assignments_exam_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_exam_id_user_id_key UNIQUE (exam_id, user_id);


--
-- Name: exam_assignments exam_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_pkey PRIMARY KEY (id);


--
-- Name: exam_questions exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_pkey PRIMARY KEY (id);


--
-- Name: exam_submissions exam_submissions_exam_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_exam_id_user_id_key UNIQUE (exam_id, user_id);


--
-- Name: exam_submissions exam_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: turmas turmas_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_code_key UNIQUE (code);


--
-- Name: turmas turmas_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_nome_key UNIQUE (nome);


--
-- Name: turmas turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turmas
    ADD CONSTRAINT turmas_pkey PRIMARY KEY (id);


--
-- Name: typing_game_scores typing_game_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_game_scores
    ADD CONSTRAINT typing_game_scores_pkey PRIMARY KEY (id);


--
-- Name: typing_game_settings typing_game_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_game_settings
    ADD CONSTRAINT typing_game_settings_pkey PRIMARY KEY (student_type);


--
-- Name: typing_pvp_matches typing_pvp_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_pvp_matches
    ADD CONSTRAINT typing_pvp_matches_pkey PRIMARY KEY (id);


--
-- Name: typing_scores typing_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_scores
    ADD CONSTRAINT typing_scores_pkey PRIMARY KEY (id);


--
-- Name: typing_settings typing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_settings
    ADD CONSTRAINT typing_settings_pkey PRIMARY KEY (student_type);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_storage_key_key UNIQUE (storage_key);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_attendance_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_date ON public.attendance_records USING btree (attendance_date);


--
-- Name: idx_attendance_records_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_user ON public.attendance_records USING btree (user_id);


--
-- Name: idx_booklet_student_module_access_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booklet_student_module_access_user ON public.booklet_student_module_access USING btree (user_id);


--
-- Name: idx_chat_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_sender ON public.chat_messages USING btree (sender_id);


--
-- Name: idx_chat_messages_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_thread ON public.chat_messages USING btree (thread_id, created_at);


--
-- Name: idx_chat_threads_dm; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_chat_threads_dm ON public.chat_threads USING btree (LEAST(user_a, user_b), GREATEST(user_a, user_b)) WHERE (type = 'dm'::text);


--
-- Name: idx_chat_threads_group; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_chat_threads_group ON public.chat_threads USING btree (turma_id) WHERE (type = 'group'::text);


--
-- Name: idx_chat_threads_turma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_threads_turma ON public.chat_threads USING btree (turma_id);


--
-- Name: idx_chat_threads_user_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_threads_user_a ON public.chat_threads USING btree (user_a);


--
-- Name: idx_chat_threads_user_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_threads_user_b ON public.chat_threads USING btree (user_b);


--
-- Name: idx_exam_answers_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_answers_submission ON public.exam_answers USING btree (submission_id);


--
-- Name: idx_exam_application_batches_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_application_batches_created ON public.exam_application_batches USING btree (created_at);


--
-- Name: idx_exam_application_items_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_application_items_batch ON public.exam_application_items USING btree (batch_id);


--
-- Name: idx_exam_application_items_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_application_items_exam ON public.exam_application_items USING btree (exam_id);


--
-- Name: idx_exam_application_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_application_items_user ON public.exam_application_items USING btree (user_id);


--
-- Name: idx_exam_assignments_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assignments_exam ON public.exam_assignments USING btree (exam_id);


--
-- Name: idx_exam_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_assignments_user ON public.exam_assignments USING btree (user_id);


--
-- Name: idx_exam_questions_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_questions_exam ON public.exam_questions USING btree (exam_id);


--
-- Name: idx_exam_submissions_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_submissions_exam ON public.exam_submissions USING btree (exam_id);


--
-- Name: idx_exam_submissions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_submissions_user ON public.exam_submissions USING btree (user_id);


--
-- Name: idx_exams_turma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_turma ON public.exams USING btree (turma_id);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_turmas_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_turmas_code ON public.turmas USING btree (code);


--
-- Name: idx_typing_game_scores_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_game_scores_created_at ON public.typing_game_scores USING btree (created_at);


--
-- Name: idx_typing_game_scores_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_game_scores_user_id ON public.typing_game_scores USING btree (user_id);


--
-- Name: idx_typing_scores_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_scores_created_at ON public.typing_scores USING btree (created_at);


--
-- Name: idx_typing_scores_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_scores_user_id ON public.typing_scores USING btree (user_id);


--
-- Name: idx_users_turma_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_turma_id ON public.users USING btree (turma_id);


--
-- Name: typing_game_ranking _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.typing_game_ranking AS
 SELECT u.id AS user_id,
    u.username AS name,
    u.role,
    COALESCE(turma.student_type, u.student_type) AS student_type,
    u.turma_id,
    count(t.id) AS missions_completed,
    COALESCE(sum(t.score), (0)::bigint) AS points,
    max(t.wpm) AS best_wpm,
    max(t.accuracy) AS best_accuracy,
    min(t.time_ms) AS best_time
   FROM (((public.users u
     LEFT JOIN public.turmas turma ON ((turma.id = u.turma_id)))
     LEFT JOIN public.typing_game_settings s ON ((s.student_type = COALESCE(turma.student_type, u.student_type))))
     LEFT JOIN public.typing_game_scores t ON (((t.user_id = u.id) AND (t.status = 'won'::text) AND (t.accuracy >= (COALESCE(s.pass_min_accuracy, 95))::numeric) AND (t.wpm >= COALESCE(s.pass_min_wpm, 40)))))
  WHERE ((u.role = 'aluno'::text) AND (u.active = true))
  GROUP BY u.id, u.display_name, u.role, COALESCE(turma.student_type, u.student_type), u.turma_id;


--
-- Name: attendance_records attendance_records_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE SET NULL;


--
-- Name: attendance_records attendance_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: booklet_student_module_access booklet_student_module_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booklet_student_module_access
    ADD CONSTRAINT booklet_student_module_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE;


--
-- Name: chat_threads chat_threads_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE;


--
-- Name: chat_threads chat_threads_user_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_user_a_fkey FOREIGN KEY (user_a) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_threads chat_threads_user_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_user_b_fkey FOREIGN KEY (user_b) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_answers exam_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers
    ADD CONSTRAINT exam_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.exam_questions(id) ON DELETE CASCADE;


--
-- Name: exam_answers exam_answers_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_answers
    ADD CONSTRAINT exam_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.exam_submissions(id) ON DELETE CASCADE;


--
-- Name: exam_application_batches exam_application_batches_applied_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_batches
    ADD CONSTRAINT exam_application_batches_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: exam_application_batches exam_application_batches_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_batches
    ADD CONSTRAINT exam_application_batches_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: exam_application_items exam_application_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_items
    ADD CONSTRAINT exam_application_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.exam_application_batches(id) ON DELETE CASCADE;


--
-- Name: exam_application_items exam_application_items_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_items
    ADD CONSTRAINT exam_application_items_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: exam_application_items exam_application_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_application_items
    ADD CONSTRAINT exam_application_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: exam_assignments exam_assignments_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_assignments exam_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_submissions exam_submissions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_submissions exam_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_submissions
    ADD CONSTRAINT exam_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exams exams_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: typing_game_scores typing_game_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_game_scores
    ADD CONSTRAINT typing_game_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: typing_pvp_matches typing_pvp_matches_loser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_pvp_matches
    ADD CONSTRAINT typing_pvp_matches_loser_id_fkey FOREIGN KEY (loser_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: typing_pvp_matches typing_pvp_matches_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_pvp_matches
    ADD CONSTRAINT typing_pvp_matches_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE CASCADE;


--
-- Name: typing_pvp_matches typing_pvp_matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_pvp_matches
    ADD CONSTRAINT typing_pvp_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: typing_scores typing_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_scores
    ADD CONSTRAINT typing_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260609000002'),
('20260609000001');

