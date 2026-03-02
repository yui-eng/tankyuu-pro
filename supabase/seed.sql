-- =============================================
-- QUEST MVP – Seed Data (Demo)
-- schema.sql を実行した後に実行してください
-- ⚠ 本番環境では使用しないこと
-- =============================================

-- ダミーUUID（実際のauth.usersと紐づけない場合、RLSを一時的に無効化して実行）
-- 実際にはSupabaseのAuth UIでユーザーを作成し、そのUUIDを使うことを推奨

-- テスト用：RLSを一時的に無効化してシード挿入（開発時のみ）
-- (本番では絶対に行わないこと)

DO $$
DECLARE
  student_id  UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  expert1_id  UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  expert2_id  UUID := 'cccccccc-0000-0000-0000-000000000001';
  admin_id    UUID := 'dddddddd-0000-0000-0000-000000000001';
  q_id        UUID := uuid_generate_v4();
  slot1_id    UUID := uuid_generate_v4();
  slot2_id    UUID := uuid_generate_v4();
  slot3_id    UUID := uuid_generate_v4();
  slot4_id    UUID := uuid_generate_v4();
  slot5_id    UUID := uuid_generate_v4();
  slot6_id    UUID := uuid_generate_v4();
  req_id      UUID := uuid_generate_v4();
  sess_id     UUID := uuid_generate_v4();
  thread_id   UUID := uuid_generate_v4();
BEGIN

-- Users
INSERT INTO public.users(id, email, name, role) VALUES
  (student_id, 'student@demo.quest', '田中 花子', 'student'),
  (expert1_id, 'expert1@demo.quest', '山田 太郎', 'expert'),
  (expert2_id, 'expert2@demo.quest', '鈴木 次郎', 'expert'),
  (admin_id,   'admin@demo.quest',   '運営 管理者', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Expert profiles
INSERT INTO public.expert_profiles(user_id, real_name, affiliation, tags, facebook_url, bio, weekly_commitment, profile_completed) VALUES
  (expert1_id, '山田 太郎', '地域創生ラボ 代表', ARRAY['地方創生','教育','社会起業'],
   'https://facebook.com/yamada-demo',
   '地方移住・起業支援を10年以上行っています。学生の探求を全力でサポートします。',
   'yes', true),
  (expert2_id, '鈴木 次郎', 'AIスタートアップ CTO', ARRAY['AI・テクノロジー','キャリア','教育'],
   'https://facebook.com/suzuki-demo',
   '元大学教授。AI・機械学習・プログラミング教育に詳しい。',
   'maybe', true)
ON CONFLICT (user_id) DO NOTHING;

-- Availability slots (3 per expert)
INSERT INTO public.availability_slots(id, expert_id, start_datetime, duration_minutes, status) VALUES
  (slot1_id, expert1_id, NOW() + INTERVAL '2 days 10:00', 20, 'free'),
  (slot2_id, expert1_id, NOW() + INTERVAL '3 days 14:00', 20, 'free'),
  (slot3_id, expert1_id, NOW() + INTERVAL '5 days 11:00', 20, 'booked'),
  (slot4_id, expert2_id, NOW() + INTERVAL '2 days 15:00', 20, 'free'),
  (slot5_id, expert2_id, NOW() + INTERVAL '4 days 10:00', 20, 'free'),
  (slot6_id, expert2_id, NOW() + INTERVAL '6 days 13:00', 20, 'free')
ON CONFLICT (id) DO NOTHING;

-- Question
INSERT INTO public.questions(id, student_id, title, background, hypothesis, stuck_point, tags) VALUES
  (q_id, student_id,
   'なぜ地方の若者は地元に残らないのか？',
   '私は岩手県の小さな町で育ちました。毎年多くの同級生が東京や仙台に進学・就職してそのまま帰ってきません。地元のお祭りの担い手も高齢化し、10年後には消滅するかもしれないと感じています。',
   '都市と地方の経済格差と情報格差が主因だと思っています。地方では「良い仕事」の情報が少なく、挑戦の機会も限られているため、若者が都市に引き寄せられるのではないかと考えています。',
   'しかし、「地方でも面白い仕事はある」という事例を見聞きします。では何が若者の意思決定を変えるのか、どう仮説を深めればいいかがわかりません。',
   ARRAY['地方創生','教育'])
ON CONFLICT (id) DO NOTHING;

-- Request (pending → accepted demo)
INSERT INTO public.requests(id, question_id, student_id, expert_id, slot_id, status) VALUES
  (req_id, q_id, student_id, expert1_id, slot3_id, 'accepted')
ON CONFLICT (id) DO NOTHING;

-- Session
INSERT INTO public.sessions(id, request_id, scheduled_at, status) VALUES
  (sess_id, req_id, NOW() + INTERVAL '5 days 11:00', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Chat thread
INSERT INTO public.chat_threads(id, request_id, student_id, expert_id) VALUES
  (thread_id, req_id, student_id, expert1_id)
ON CONFLICT (id) DO NOTHING;

-- Chat messages (demo conversation)
INSERT INTO public.chat_messages(thread_id, sender_id, message, created_at) VALUES
  (thread_id, student_id,
   '依頼を送りました！よろしくお願いします。セッションについてここで事前確認できます。',
   NOW() - INTERVAL '2 days'),
  (thread_id, expert1_id,
   'こんにちは！依頼ありがとうございます。地方創生については私も長年取り組んでいるテーマなので、一緒に考えましょう。事前に何かご質問はありますか？',
   NOW() - INTERVAL '1 day 20 hours'),
  (thread_id, student_id,
   'ありがとうございます！セッションが楽しみです。事前に、山田さんが地方で成功していると思う取り組みを1つ教えていただけますか？当日の参考にしたいです。',
   NOW() - INTERVAL '1 day 18 hours'),
  (thread_id, expert1_id,
   '良い質問ですね！島根県の「地域おこし協力隊」の取り組みが面白いと思っています。外から来た若者が地域のリソースを活かして事業を作る事例が増えています。当日詳しくお話ししましょう！',
   NOW() - INTERVAL '1 day 10 hours'),
  (thread_id, student_id,
   'ありがとうございます！予習しておきます。当日よろしくお願いします🙏',
   NOW() - INTERVAL '1 day');

END $$;
