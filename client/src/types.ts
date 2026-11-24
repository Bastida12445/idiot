export interface Project {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  cover_image: string | null;
  gallery: string[];
  technologies: string[];
  owner_member_id: string | null;
  contributing_member_ids: string[];
  completed_at: string | null;
  github_url: string | null;
  live_url: string | null;
  featured: boolean;
  published: boolean;
  created_at: string;
}
export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  image_url: string | null;
  category: string;
  published: boolean;
  sort_order: number;
}
export interface TeamMember {
  id: string;
  full_name: string;
  slug: string;
  title: string;
  bio: string;
  photo_url: string | null;
  skills: string[];
  education: string | null;
  specialization: string | null;
  email: string | null;
  facebook_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  phone: string | null;
  active: boolean;
  sort_order: number;
}
export interface Testimonial {
  id: string;
  client_name: string;
  photo_url: string | null;
  rating: number;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}
export interface WebsiteSettings {
  company_name?: string;
  logo_url?: string | null;
  tagline?: string;
  hero_headline?: string;
  hero_description?: string;
  company_email?: string;
  facebook_url?: string | null;
  phone?: string | null;
  footer_text?: string;
  social_links?: { label: string; url: string }[];
  seo_title?: string;
  seo_description?: string;
  story?: string;
  mission?: string;
  vision?: string;
  values?: string[];
}
