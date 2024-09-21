# Next.js SaaS Template with Supabase Auth

This repository contains a modern, scalable SaaS (Software as a Service) template built with Next.js,
TypeScript, and Supabase. The core feature of this template is a comprehensive authentication flow implemented
using Supabase Auth, providing a robust and flexible solution for user authentication and management.

## Features

- Next.js framework for server-side rendering and API routes
- TypeScript for enhanced type safety and developer experience
- Full authentication flow using Supabase Auth, including:
    - Email/Password Sign In
    - Email (Magic Link) Sign In
    - OAuth Sign In (supporting multiple providers)
    - User Registration
    - Password Reset
- Dynamic and lazy-loaded authentication forms
- Customizable UI components using Tailwind CSS and Radix UI
- State management with Zustand
- Form handling with React Hook Form and Zod for validation
- Comprehensive testing setup with Vitest and React Testing Library
- Linting and formatting with ESLint and Biome
- Logging with Pino

## Authentication Flow

The authentication system is built around a flexible `Auth` component that:

- Dynamically renders different authentication forms based on enabled methods
- Supports email/password, magic link, and OAuth authentication
- Provides a seamless user experience for sign up and password reset
- Implements lazy loading for improved performance
- Ensures accessibility with proper ARIA attributes and semantic HTML
