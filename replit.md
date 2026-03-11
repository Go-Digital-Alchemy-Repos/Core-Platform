# TCK Wellness — Counselor Directory & Subscription Platform

## Overview
TCK Wellness is a BetterHelp-style platform featuring a counselor directory and subscription service for TCK-informed counselors. It provides a searchable public directory, custom JWT authentication, OpenStreetMap/Leaflet maps, Stripe subscriptions, and a comprehensive admin dashboard. The project aims to connect Third Culture Kids (TCKs) with specialized mental health support, addressing a critical need in a niche market.

## User Preferences
- All visible text uses "Counselor"/"Counselors" throughout the UI (navbar, footer, home, directory, admin, auth pages).
- Code identifiers, API routes (`/api/therapist/*`, `/api/therapists`), DB columns, and role values (`"therapist"`) remain unchanged.

## System Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter, TanStack Query v5
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom JWT with bcryptjs, HTTP-only cookies
- **Payments**: Stripe subscriptions
- **Maps**: OpenStreetMap + Leaflet (react-leaflet v4.2.1)
- **Fonts**: EB Garamond (headings), Nunito (body)

### Core Features
- **Counselor Directory**: Searchable profiles with filtering by specialization, language, country, and session format. Features a split-pane view with a scrollable list and sticky map.
- **User Authentication**: Custom JWT-based authentication with three roles: admin, therapist, and client.
- **Subscription Management**: Stripe integration for managing counselor membership tiers (Basic, Professional, Premium).
- **Event Management**: Platform for creating, managing, and displaying events (virtual, in-person, hybrid). Includes registration (free and paid via Stripe Checkout), waitlisting, attendance tracking, and bulk notifications.
- **Recording Archives**: Role-aware archive of past events with recordings, accessible at `/recordings`. Supports YouTube and Vimeo embeds.
- **Admin Dashboard**: Comprehensive interface for managing users, therapists (CRUD, approval, rejection, activity logs), membership tiers, events, contact messages, blog posts, and system settings.
- **Internal Messaging**: System for direct messages and conversations with rich text and attachments.
- **Notifications**: In-app notification system with per-user preferences.
- **CMS (Content Management System)**: Nondestructive admin-only CMS for managing public-facing pages with revision history and SEO fields.

### Data Model Highlights
- **Users**: Core user accounts with roles.
- **Therapist Profiles**: Detailed profiles including location, specializations, and `isFeatured` status.
- **Membership Tiers & Subscriptions**: Defines pricing and links to Stripe subscriptions.
- **Events**: Stores event details, visibility, registration options, and speaker metadata.
- **Contact Messages**: Manages contact form submissions.
- **System Settings**: Key-value store for configuration, including encrypted secrets.
- **Email Templates**: Customizable system email templates with placeholders.
- **Activity Logs**: Tracks user actions.
- **Conversations & Direct Messages**: Supports internal messaging.
- **Notifications & Preferences**: Manages in-app notifications.
- **Specializations**: Dynamic list of counselor specializations.
- **Blog Posts**: Manages blog content.
- **Event Registrations**: Tracks user registrations for events, including status, payment status, and attendance.
- **Profile Views**: Tracks views on therapist profiles.
- **Saved Counselors**: Junction table for users to save/favorite counselors.
- **CMS Pages & Revisions**: Stores content for static pages and their version history.

### UI/UX Design
- **Consistent Terminology**: "Counselor"/"Counselors" used across all visible UI elements.
- **Component Library**: Utilizes shadcn/ui with Tailwind CSS for a modern, responsive design.
- **Responsive Design**: Custom breakpoints for optimal viewing across devices (xs=480px, sm=640px, md=768px, lg=1024px, xl=1280px).
- **Sheet Component**: All form/detail popups use `Sheet` (slide-out drawer from right) with various size variants, reserving `AlertDialog` for confirmations.
- **Branding**: Uses a defined color palette (Navy, Sage, Copper, Teal).

### Architecture Patterns
- **Modular File Structure**: Organizes backend by concern (`schema`, `types`, `middleware`, `storage`, `routes`, `services`) and frontend by feature.
- **Separation of Concerns**: Clear distinction between frontend and backend, with dedicated API endpoints for data interaction.
- **Structured Logging**: Implements a structured logger with named sources (http, email, r2, stripe, auth, app, db) and request IDs for enhanced observability.
- **Performance Optimization**: Route-level lazy loading for frontend pages using `React.lazy()` and `Suspense`, and a strategic React Query cache strategy with `staleTime`, `gcTime`, and `refetchOnWindowFocus` configurations.
- **Database Indexing & FK Constraints**: Extensive B-tree and GIN indexes, along with foreign key constraints, to ensure data integrity and optimize query performance, especially for directory and notification features.

## External Dependencies
- **Stripe**: For processing subscriptions and paid event registrations.
- **OpenStreetMap & Leaflet**: For geographical mapping functionalities in the directory and event details.
- **Mailgun / Nodemailer**: Primary and fallback email service providers for transactional emails.
- **Cloudflare R2**: S3-compatible object storage for avatar uploads and other media (with local fallback).
- **Zod**: Schema validation library used for request validation.
- **bcryptjs**: Password hashing.
- **JWT (JSON Web Tokens)**: For custom authentication.
- **Helmet**: Security middleware for setting HTTP headers.
- **express-rate-limit**: Middleware for API rate limiting.
- **Wouter**: Lightweight React router.
- **TanStack Query**: Data fetching and caching library for React.