import { z } from 'zod';

const optionalText = (max = 5000) => z.string().trim().max(max).optional().nullable();
const url = z.string().trim().url().optional().nullable().or(z.literal(''));
const uuid = z.string().uuid();

export const projectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  short_description: z.string().trim().min(5).max(300),
  description: z.string().trim().max(12000).optional().default(''),
  category: z.string().trim().min(1).max(80),
  cover_image: url,
  gallery: z.array(url).max(20).optional().default([]),
  technologies: z.array(z.string().trim().min(1).max(40)).max(30).optional().default([]),
  owner_member_id: uuid.nullable().optional(),
  contributing_member_ids: z.array(uuid).max(3).optional().default([]),
  completed_at: z.string().date().nullable().optional(),
  github_url: url,
  live_url: url,
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(false),
});

export const serviceSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(5000),
  icon: z.string().trim().max(60).optional().default('sparkles'),
  image_url: url,
  category: z.string().trim().min(1).max(80),
  published: z.boolean().optional().default(false),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const teamSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(5000).optional().default(''),
  photo_url: url,
  skills: z.array(z.string().trim().min(1).max(50)).max(30).optional().default([]),
  education: optionalText(500),
  specialization: optionalText(250),
  email: z.string().email().max(254).or(z.literal('')).optional().nullable(),
  facebook_url: url,
  github_url: url,
  linkedin_url: url,
  phone: optionalText(40),
  sort_order: z.number().int().min(0).optional().default(0),
  auth_user_id: uuid.nullable().optional(),
  active: z.boolean().optional().default(true),
});

export const testimonialSchema = z.object({
  client_name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254).optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(10).max(2000),
  photo_url: url,
});

export const testimonialUpdateSchema = testimonialSchema.partial().extend({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export const contactSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
});

export const settingsSchema = z.object({
  company_name: z.string().trim().max(120),
  logo_url: url,
  tagline: z.string().trim().max(200),
  hero_headline: z.string().trim().max(240),
  hero_description: z.string().trim().max(1000),
  company_email: z.string().email().max(254).or(z.literal('')),
  facebook_url: url,
  phone: optionalText(40),
  footer_text: z.string().trim().max(400),
  social_links: z.array(z.object({ label: z.string().max(40), url: z.string().url() })).max(10),
  seo_title: z.string().trim().max(120),
  seo_description: z.string().trim().max(300),
  story: z.string().trim().max(5000),
  mission: z.string().trim().max(1000),
  vision: z.string().trim().max(1000),
  values: z.array(z.string().trim().max(100)).max(12),
}).partial();

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  return schema.parse(body);
}
