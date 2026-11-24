import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { default as helmet } from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { analyticsConfigured, config, integrationStatus, mailConfigured, supabaseConfigured } from './config.js';
import { asyncRoute, requireAdmin, requireConfiguration, requireUser, sendSupabaseError } from './middleware.js';
import { notifyContact } from './mail.js';
import { publicSupabase, secretSupabase, userClient } from './supabase.js';
import {
  contactSchema, parseBody, projectSchema, serviceSchema, settingsSchema,
  teamSchema, testimonialSchema, testimonialUpdateSchema,
} from './validators.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.origins, credentials: false, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb' }));

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false });
const submissionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const analyticsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false });
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', integrations: integrationStatus() });
});

app.use('/api', publicLimiter, requireConfiguration);

app.get('/api/auth/me', requireUser, requireAdmin, asyncRoute(async (req, res) => {
  const { data, error } = await userClient(req.accessToken!).from('profiles').select('id,email,role').eq('id', req.userId!).single();
  if (error) return handleQueryError(res, error);
  res.json({ data });
}));

const adminIfRequested: express.RequestHandler = (req, res, next) => {
  if (req.query.all !== 'true') return next();
  requireUser(req, res, () => requireAdmin(req, res, next));
};

function clientFor(req: express.Request) {
  return req.accessToken ? userClient(req.accessToken) : publicSupabase!;
}

function handleQueryError(res: express.Response, error: { message: string; code?: string }) {
  sendSupabaseError(res, error);
}

const resourceRoutes = [
  { route: 'projects', table: 'projects', schema: projectSchema },
  { route: 'services', table: 'services', schema: serviceSchema },
  { route: 'team', table: 'team_members', schema: teamSchema },
] as const;
const publicTeamColumns = 'id,full_name,slug,title,bio,photo_url,skills,education,specialization,email,facebook_url,github_url,linkedin_url,phone,active,sort_order,created_at,updated_at';

for (const resource of resourceRoutes) {
  const router = express.Router();
  router.get('/', adminIfRequested, asyncRoute(async (req, res) => {
    const columns = resource.route === 'team' && req.query.all !== 'true' ? publicTeamColumns : '*';
    let query = clientFor(req).from(resource.table).select(columns, { count: 'exact' }).order('created_at', { ascending: false });
    if (resource.route === 'team' && req.query.all !== 'true') {
      query = clientFor(req).from(resource.table).select('*').eq('active', true).order('sort_order', { ascending: true });
    } else if (resource.route !== 'team' && req.query.all !== 'true') {
      query = query.eq('published', true);
    }
    if (resource.route === 'projects') {
      if (typeof req.query.category === 'string' && req.query.category !== 'all') query = query.eq('category', req.query.category);
      if (typeof req.query.q === 'string' && req.query.q.trim()) {
        const safe = req.query.q.toString().replace(/[,%()]/g, ' ').trim().slice(0, 80);
        query = query.or(`title.ilike.%${safe}%,short_description.ilike.%${safe}%,category.ilike.%${safe}%`);
      }
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
    const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (error) return handleQueryError(res, error);
    res.json({ data: data ?? [], total: count ?? data?.length ?? 0, page, pageSize });
  }));
  if (resource.route === 'projects') {
    router.get('/categories', asyncRoute(async (_req, res) => {
      const { data, error } = await publicSupabase!.from('projects').select('category').eq('published', true);
      if (error) return handleQueryError(res, error);
      res.json({ data: [...new Set((data ?? []).map((item) => item.category))].sort() });
    }));
    router.get('/slug/:slug', asyncRoute(async (req, res) => {
      const { data, error } = await publicSupabase!.from('projects').select('*')
        .eq('slug', req.params.slug).eq('published', true).maybeSingle();
      if (error) return handleQueryError(res, error);
      if (!data) return res.status(404).json({ error: 'Project not found.' });
      res.json({ data });
    }));
  }
  router.get('/:id', asyncRoute(async (req, res) => {
    let query = publicSupabase!.from(resource.table).select(resource.route === 'team' ? publicTeamColumns : '*').eq('id', req.params.id);
    if (resource.route !== 'team') query = query.eq('published', true);
    else query = query.eq('active', true);
    const { data, error } = await query.maybeSingle();
    if (error) return handleQueryError(res, error);
    if (!data) return res.status(404).json({ error: 'Record not found.' });
    res.json({ data });
  }));
  router.post('/', requireUser, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = parseBody(resource.schema, req.body);
    if (resource.route === 'team') {
      const { count, error: countError } = await userClient(req.accessToken!).from('team_members').select('id', { count: 'exact', head: true });
      if (countError) return handleQueryError(res, countError);
      if ((count ?? 0) >= 3) return res.status(409).json({ error: 'This studio is designed for exactly three team profiles. Edit an existing profile instead.' });
    }
    const { data, error } = await userClient(req.accessToken!).from(resource.table).insert(parsed as never).select('*').single();
    if (error) return handleQueryError(res, error);
    res.status(201).json({ data });
  }));
  router.put('/:id', requireUser, requireAdmin, asyncRoute(async (req, res) => {
    const parsed = parseBody(resource.schema.partial(), req.body);
    const { data, error } = await userClient(req.accessToken!).from(resource.table).update(parsed as never).eq('id', req.params.id).select('*').maybeSingle();
    if (error) return handleQueryError(res, error);
    if (!data) return res.status(404).json({ error: 'Record not found.' });
    res.json({ data });
  }));
  router.delete('/:id', requireUser, requireAdmin, asyncRoute(async (req, res) => {
    const { error } = await userClient(req.accessToken!).from(resource.table).delete().eq('id', req.params.id);
    if (error) return handleQueryError(res, error);
    res.status(204).end();
  }));
  app.use(`/api/${resource.route}`, router);
}

const testimonialRouter = express.Router();
testimonialRouter.get('/', adminIfRequested, asyncRoute(async (req, res) => {
  let query = clientFor(req).from('testimonials').select('id,client_name,photo_url,rating,message,status,created_at,updated_at').order('created_at', { ascending: false });
  if (req.query.all !== 'true') query = query.eq('status', 'approved');
  else if (typeof req.query.status === 'string' && req.query.status !== 'all') query = query.eq('status', req.query.status);
  const { data, error } = await query;
  if (error) return handleQueryError(res, error);
  res.json({ data: data ?? [] });
}));
testimonialRouter.post('/', submissionLimiter, asyncRoute(async (req, res) => {
  const parsed = parseBody(testimonialSchema, req.body);
  if (!secretSupabase) return res.status(503).json({ error: 'Server submissions are not configured. Set SUPABASE_SECRET_KEY on the API server.' });
  const { data, error } = await secretSupabase.rpc('submit_testimonial', {
    p_client_name: parsed.client_name, p_email: parsed.email || null, p_photo_url: parsed.photo_url || null,
    p_rating: parsed.rating, p_message: parsed.message,
  });
  if (error) return handleQueryError(res, error);
  res.status(201).json({ data: data as object, message: 'Thank you. Your testimonial is awaiting review.' });
}));
testimonialRouter.put('/:id', requireUser, requireAdmin, asyncRoute(async (req, res) => {
  const parsed = parseBody(testimonialUpdateSchema, req.body);
  const { data, error } = await userClient(req.accessToken!).from('testimonials').update(parsed).eq('id', req.params.id)
    .select('id,client_name,photo_url,rating,message,status,created_at,updated_at').maybeSingle();
  if (error) return handleQueryError(res, error);
  if (!data) return res.status(404).json({ error: 'Testimonial not found.' });
  res.json({ data });
}));
testimonialRouter.post('/:id/approve', requireUser, requireAdmin, asyncRoute(async (req, res) => {
  const { data, error } = await userClient(req.accessToken!).from('testimonials').update({ status: 'approved' })
    .eq('id', req.params.id).select('id, status').maybeSingle();
  if (error) return handleQueryError(res, error);
  if (!data) return res.status(404).json({ error: 'Testimonial not found.' });
  res.json({ data });
}));
testimonialRouter.delete('/:id', requireUser, requireAdmin, asyncRoute(async (req, res) => {
  const { error } = await userClient(req.accessToken!).from('testimonials').delete().eq('id', req.params.id);
  if (error) return handleQueryError(res, error);
  res.status(204).end();
}));
app.use('/api/testimonials', testimonialRouter);

app.post('/api/contact', submissionLimiter, asyncRoute(async (req, res) => {
  const parsed = parseBody(contactSchema, req.body);
  if (!secretSupabase) return res.status(503).json({ error: 'Server submissions are not configured. Set SUPABASE_SECRET_KEY on the API server.' });
  const { data, error } = await secretSupabase.rpc('submit_contact_message', {
    p_full_name: parsed.full_name, p_email: parsed.email, p_subject: parsed.subject, p_message: parsed.message,
  });
  if (error) return handleQueryError(res, error);
  const messageId = data as string;
  let emailStatus = 'failed';
  let emailError: string | null = null;
  try {
    await notifyContact(parsed);
    emailStatus = 'sent';
  } catch (caught) {
    emailError = caught instanceof Error ? caught.message : 'Email delivery failed.';
  }
  const { error: updateError } = await secretSupabase.rpc('set_contact_notification_status', {
    p_message_id: messageId, p_status: emailStatus, p_error: emailError,
  });
  if (updateError) console.error('Could not update notification status:', updateError.message);
  res.status(201).json({
    message: 'Your message has been received. We will be in touch soon.',
    emailNotification: emailStatus,
  });
}));

const messageRouter = express.Router();
messageRouter.use(requireUser, requireAdmin);
messageRouter.get('/', asyncRoute(async (req, res) => {
  let query = userClient(req.accessToken!).from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200);
  if (typeof req.query.unread === 'string') query = query.eq('is_read', req.query.unread !== 'true');
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const safe = req.query.q.toString().replace(/[,%()]/g, ' ').trim().slice(0, 80);
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,subject.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) return handleQueryError(res, error);
  res.json({ data: data ?? [] });
}));
messageRouter.put('/:id', asyncRoute(async (req, res) => {
  const parsed = z.object({ is_read: z.boolean().optional() }).strict().parse(req.body);
  const { data, error } = await userClient(req.accessToken!).from('contact_messages')
    .update(parsed).eq('id', req.params.id).select('*').maybeSingle();
  if (error) return handleQueryError(res, error);
  if (!data) return res.status(404).json({ error: 'Message not found.' });
  res.json({ data });
}));
messageRouter.delete('/:id', asyncRoute(async (req, res) => {
  const { error } = await userClient(req.accessToken!).from('contact_messages').delete().eq('id', req.params.id);
  if (error) return handleQueryError(res, error);
  res.status(204).end();
}));
messageRouter.post('/:id/retry-email', asyncRoute(async (req, res) => {
  const client = userClient(req.accessToken!);
  const { data, error } = await client.from('contact_messages').select('full_name,email,subject,message').eq('id', req.params.id).maybeSingle();
  if (error) return handleQueryError(res, error);
  if (!data) return res.status(404).json({ error: 'Message not found.' });
  try {
    await notifyContact(data);
    await client.from('contact_messages').update({ email_status: 'sent', email_error: null }).eq('id', req.params.id);
    res.json({ message: 'Notification email sent.' });
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message : 'Email delivery failed.';
    await client.from('contact_messages').update({ email_status: 'failed', email_error: detail }).eq('id', req.params.id);
    res.status(502).json({ error: detail });
  }
}));
app.use('/api/messages', messageRouter);

app.get('/api/settings', asyncRoute(async (_req, res) => {
  const { data, error } = await publicSupabase!.from('website_settings').select('*').eq('id', 'default').maybeSingle();
  if (error) return handleQueryError(res, error);
  res.json({ data: data ?? null });
}));
app.put('/api/settings', requireUser, requireAdmin, asyncRoute(async (req, res) => {
  const parsed = parseBody(settingsSchema, req.body);
  const { data, error } = await userClient(req.accessToken!).from('website_settings')
    .upsert({ id: 'default', ...parsed }, { onConflict: 'id' }).select('*').single();
  if (error) return handleQueryError(res, error);
  res.json({ data });
}));

const trackSchema = z.object({
  event_id: z.string().uuid(),
  visitor_id: z.string().uuid(),
  path: z.string().trim().min(1).max(500).startsWith('/').refine((path) => !path.startsWith('/admin') && !path.startsWith('/login')),
});
const analyticsRouter = express.Router();
analyticsRouter.post('/track', analyticsLimiter, asyncRoute(async (req, res) => {
  const parsed = parseBody(trackSchema, req.body);
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    const scoped = userClient(token);
    const { data: { user } } = await scoped.auth.getUser(token);
    if (user) {
      const { data: profile } = await scoped.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role === 'admin') return res.status(202).json({ tracked: false });
    }
  }
  const agent = req.get('user-agent') || '';
  if (/bot|crawler|spider|slurp|headless|preview/i.test(agent)) return res.status(202).json({ tracked: false });
  if (!analyticsConfigured) return res.status(503).json({ error: 'Set ANALYTICS_HASH_SECRET to a random value of at least 32 characters.' });
  const visitorHash = crypto.createHmac('sha256', config.analyticsSecret).update(parsed.visitor_id).digest('hex');
  if (!secretSupabase) return res.status(503).json({ error: 'Server submissions are not configured. Set SUPABASE_SECRET_KEY on the API server.' });
  const { error } = await secretSupabase.rpc('record_visitor_event', {
    p_event_id: parsed.event_id, p_visitor_hash: visitorHash, p_path: parsed.path,
  });
  if (error) return handleQueryError(res, error);
  res.status(202).json({ tracked: true });
}));

analyticsRouter.use(requireUser, requireAdmin);
analyticsRouter.get('/overview', asyncRoute(async (req, res) => {
  const client = userClient(req.accessToken!);
  const { data, error } = await client.rpc('admin_analytics_overview');
  if (error) return handleQueryError(res, error);
  res.json({ data });
}));
analyticsRouter.get('/visitors', asyncRoute(async (req, res) => {
  const parsedRange = z.enum(['today', '7d', '30d', '12m']).safeParse(req.query.range || '7d');
  if (!parsedRange.success) return res.status(400).json({ error: 'Range must be today, 7d, 30d, or 12m.' });
  const { data, error } = await userClient(req.accessToken!).rpc('admin_analytics_report', { p_range: parsedRange.data });
  if (error) return handleQueryError(res, error);
  res.json({ data });
}));
analyticsRouter.get('/pages', asyncRoute(async (req, res) => {
  const parsedRange = z.enum(['today', '7d', '30d', '12m']).safeParse(req.query.range || '30d');
  if (!parsedRange.success) return res.status(400).json({ error: 'Range must be today, 7d, 30d, or 12m.' });
  const { data, error } = await userClient(req.accessToken!).rpc('admin_analytics_report', { p_range: parsedRange.data });
  if (error) return handleQueryError(res, error);
  res.json({ data: (data as { pages?: unknown[] }).pages ?? [] });
}));
app.use('/api/analytics', analyticsRouter);

const uploadRouter = express.Router();
uploadRouter.use(requireUser, requireAdmin);
uploadRouter.post('/', asyncRoute(async (req, res) => {
  const input = z.object({
    bucket: z.enum(['project-images', 'team-images', 'service-images', 'testimonial-images']),
    path: z.string().min(1).max(500).refine((value) => !value.includes('..') && !value.startsWith('/')),
  }).parse(req.body);
  const { error } = await userClient(req.accessToken!).storage.from(input.bucket).remove([input.path]);
  if (error) return handleQueryError(res, error);
  res.json({ message: 'Image removed.' });
}));
app.use('/api/storage', uploadRouter);

app.use((req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.path}` }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Please correct the highlighted fields.', details: error.issues });
    return;
  }
  console.error('API error:', error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
    console.log(`Integration status: ${JSON.stringify(integrationStatus())}`);
    if (!supabaseConfigured) console.warn('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env to enable database-backed features.');
    if (!secretSupabase) console.warn('Contact/testimonial/analytics submissions require SUPABASE_SECRET_KEY; endpoints remain disabled until configured.');
    if (!mailConfigured) console.warn('Configure Gmail SMTP variables to send contact notifications; submissions can still be saved when server submissions are configured.');
  });
}
