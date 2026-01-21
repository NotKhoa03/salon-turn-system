# Nail Salon POS - Turn-Based System

A modern, production-ready Next.js application for managing employee turns at a nail salon. The system tracks employee clock-ins, automatically assigns services based on turn order, and maintains comprehensive turn history.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Testing**: Playwright
- **Deployment**: Vercel

## Features

- **Authentication**: Login system with role-based access (Employee vs Admin)
- **Employee Management**: Clock in/out, turn queue tracking
- **Service Assignment**: Quick assign next employee, manual override
- **Turn Logic**: Full turns (services >= $30) and half turns (services < $30)
- **Real-time Updates**: Live sync across multiple devices using Supabase Realtime
- **Admin Panel**: Manage employees, services, users, and view history
- **Turn History Grid**: Visual grid showing turn status with hover/click details

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm or yarn
- Supabase account

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/salon-turn-system.git
cd salon-turn-system
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Run the seed file for initial data: `supabase/seed.sql`
4. Get your project credentials from **Settings > API**

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=admin@salon.com
ADMIN_PASSWORD=changeme123
```

### 4. Create Admin User

**Option A**: Run the seed script
```bash
npm run seed
```

**Option B**: Use Supabase Dashboard
1. Go to **Authentication > Users**
2. Click **Add User**
3. Enter email and password
4. After creating, run this SQL:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin-email';
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── login/             # Login page
│   ├── admin/             # Admin panel pages
│   ├── page.tsx           # Main POS dashboard
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── turn-queue/        # Queue-related components
│   └── turn-grid/         # Turn history grid
├── lib/
│   ├── hooks/             # Custom React hooks
│   ├── supabase/          # Supabase client setup
│   ├── types/             # TypeScript types
│   └── utils.ts           # Utility functions
└── middleware.ts          # Auth middleware
```

## Turn Logic Rules

| Service Price | Turn Type | Behavior |
|--------------|-----------|----------|
| >= $30 | Full Turn | Employee moves to back of queue after completion |
| < $30 | Half Turn | Does NOT advance position, marks as busy |

### Queue Priority
1. Employees sorted by completed turn count (lowest first)
2. Ties broken by clock-in time (earliest first)
3. Busy employees are skipped during Quick Assign

## Testing

Run Playwright tests:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in headed mode
npm run test:headed
```

## Default Services

| Service | Price | Turn Type |
|---------|-------|-----------|
| Manicure | $25 | Half |
| Pedicure | $45 | Full |
| Full Set | $55 | Full |
| Fill | $40 | Full |
| Gel Manicure | $35 | Full |
| Gel Pedicure | $55 | Full |
| Acrylic Removal | $15 | Half |
| Nail Art (per nail) | $5 | Half |
| Polish Change | $15 | Half |
| Dip Powder | $50 | Full |

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## License

MIT
