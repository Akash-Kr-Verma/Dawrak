-- supabase/seed.sql
-- Realistic seed data demonstrating core MIL concepts

insert into public.scenarios (
  title, 
  body_context, 
  category, 
  media_url, 
  verdict, 
  is_community_submitted, 
  reports_count, 
  is_hidden
) values 
(
  'Free State University Anniversary Laptop Giveaway',
  'Shared widely on WhatsApp: "In celebration of State University''s 50th Anniversary, the administration is giving away 5,000 free student laptops. Click this link to claim yours immediately: state-uni-anniversary-rewards.xyz/laptops"',
  'source_checking',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800',
  'fake',
  false,
  0,
  false
),
(
  'Dr. Oz Endorsement of Miracle Herb for Type 2 Diabetes Recovery',
  'Shared on Facebook: A video showing television doctor Dr. Oz claiming a simple root extract cures Type 2 diabetes permanently in 7 days, complete with patient testimonials and buying links.',
  'deepfake',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800',
  'fake',
  false,
  0,
  false
),
(
  'Urgent SMS Security Alert from Apex Bank Limited',
  'Received via SMS text message: "ApexBank Alert: Your debit card has been temporarily deactivated due to unusual activity. To reactivate immediately, verify your identity: apexbank-reactivate-card.secure-verify-auth.net"',
  'phishing',
  'https://images.unsplash.com/photo-1563013544-824ae1d704d3?q=80&w=800',
  'fake',
  false,
  0,
  false
),
(
  'Government Secretly Banning Cash Payments to Track Citizens',
  'Shared on Twitter/X: "URGENT: Government is passing a secret midnight law outlawing all physical cash transactions to force everyone onto traceable digital cards! Share this before they delete it!"',
  'emotional_manipulation',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=800',
  'fake',
  false,
  0,
  false
);
