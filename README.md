# 🏢 Employee Onboarding Management System

A comprehensive employee onboarding system with department-specific forms, admin approval workflow, and document management.

![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![Vite](https://img.shields.io/badge/Vite-5.4.19-purple)

## ✨ Features

### 🎯 Department-Specific Onboarding
- **6 Departments:** IT, Sales, Marketing, HR, Finance, Operations
- **Custom Forms:** Each department has unique document requirements
- **Dynamic Fields:** Forms adapt based on selected department

### 👨‍💼 Admin Features
- **Approval Workflow:** Approve or reject employee submissions
- **Rejection with Reasons:** Provide feedback for rejected submissions
- **Resubmission:** Employees can fix and resubmit rejected forms
- **Dashboard:** View all submissions with filtering and search

### 📄 Document Management
- **Department-Specific Documents:**
  - IT: Offer Letter + Resume + Technical Skills
  - Sales: Video Pitch (50MB) + Resume + Experience
  - Marketing: Portfolio + Resume + Campaigns
  - HR: Certifications + Resume + Experience
  - Finance: Degree Certificate + Resume + Certifications
  - Operations: Experience Letter + Resume

### 🎨 Professional UI
- **Clean Dashboard:** Organized sections with separators
- **Smart Document Display:** View/Download buttons for files
- **Badge Support:** Skills and arrays shown as badges
- **Mobile Responsive:** Works on all screen sizes

### 🔐 Security
- **Row Level Security (RLS):** Supabase policies
- **Protected Routes:** Role-based access control
- **Secure Storage:** Documents stored in Supabase Storage
- **Environment Variables:** Credentials protected in .gitignore

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Khushiiiii22/employee_badge.git
   cd employee_badge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Run database migrations**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - SQL Editor → New Query
   - Run the SQL from `docs/RUN_THIS_SQL_FIRST.md`

5. **Create admin user**
   - See `docs/ADMIN_SETUP_GUIDE.md` for instructions
   - Default credentials: See `docs/ADMIN_CREDENTIALS.md`

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:8081
   ```

---

## 📚 Documentation

All documentation is in the [`docs/`](./docs/) folder:

### Quick Links
- 📖 [Complete Setup Guide](./docs/COMPLETE_SETUP_GUIDE.md)
- 🚀 [Quick Start](./docs/QUICK_START.md)
- 👨‍💼 [Admin Setup](./docs/ADMIN_SETUP_GUIDE.md)
- 🗄️ [Database Setup](./docs/RUN_THIS_SQL_FIRST.md)
- 🐛 [Bug Fixes](./docs/ALL_FIXES_SUMMARY.md)
- 🎨 [UI Improvements](./docs/UI_IMPROVEMENTS_SIDEBAR.md)
- 🔐 [Security Guide](./docs/SECURITY_FIX_ENV.md)

See [`docs/README.md`](./docs/README.md) for the complete documentation index.

---

## 🏗️ Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool
- **TailwindCSS 3.4.17** - Styling
- **shadcn/ui** - Component library
- **React Router v6.30.1** - Routing
- **React Hook Form 7.61.1** - Form handling
- **Zod 3.25.76** - Validation

### Backend
- **Supabase** - Database, Auth, Storage
- **PostgreSQL** - Database
- **Row Level Security** - Access control

### Development
- **ESLint** - Code linting
- **TypeScript ESLint** - TS linting
- **PostCSS** - CSS processing

---

## 📂 Project Structure

```
employee_badge/
├── docs/                   # All documentation
│   ├── README.md          # Documentation index
│   ├── QUICK_START.md     # Quick start guide
│   └── ...                # 35+ guide files
├── src/
│   ├── components/        # React components
│   │   ├── dashboard/    # Dashboard components
│   │   │   └── admin/    # Admin-specific components
│   │   └── ui/           # shadcn/ui components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Supabase integration
│   └── lib/              # Utility functions
├── supabase/
│   └── migrations/       # Database migrations
├── public/               # Static assets
├── .env.example          # Environment variables template
└── package.json          # Dependencies
```

---

## 🎯 User Workflows

### Employee Flow
1. **Sign Up** → Select department
2. **Fill Form** → Department-specific fields
3. **Upload Documents** → Required files
4. **Submit** → Wait for approval
5. **Dashboard Access** → After approval

### Admin Flow
1. **Login** → Admin credentials
2. **View Submissions** → All pending forms
3. **Review** → Check documents and data
4. **Approve/Reject** → With optional reason
5. **Manage** → Track all onboarding status

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from:
1. [Supabase Dashboard](https://app.supabase.com)
2. Your Project → Settings → API
3. Copy Project URL and anon/public key

---

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Test specific flow
node test-onboarding-flow.js
node test-department-onboarding-flow.js
```

See [`docs/QUICK_TEST_GUIDE.md`](./docs/QUICK_TEST_GUIDE.md) for testing instructions.

---

## 🐛 Known Issues & Fixes

All issues have been resolved! See:
- [`docs/ALL_FIXES_SUMMARY.md`](./docs/ALL_FIXES_SUMMARY.md) - Complete fix list
- [`docs/ONBOARDING_FLOW_FIXED.md`](./docs/ONBOARDING_FLOW_FIXED.md) - Routing fixes
- [`docs/ADMIN_APPROVAL_FIXED.md`](./docs/ADMIN_APPROVAL_FIXED.md) - Approval workflow

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is part of an employee management system.

---

## 👥 Authors

- **Khushi** - Initial work - [Khushiiiii22](https://github.com/Khushiiiii22)

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [Supabase](https://supabase.com/) - Backend infrastructure
- [React](https://react.dev/) - UI framework
- [Vite](https://vitejs.dev/) - Fast build tool

---

## 📞 Support

For issues and questions:
- 📖 Check the [documentation](./docs/)
- 🐛 Open an [issue](https://github.com/Khushiiiii22/employee_badge/issues)
- 📧 Contact the maintainer

---

## 🎉 Status

✅ **Complete and Working**

All features tested and functional:
- ✅ 6-department onboarding system
- ✅ Admin approval workflow
- ✅ Document upload/download
- ✅ Professional dashboard UI
- ✅ Security configured
- ✅ Database migrations ready

**Ready for production!** 🚀

---

**Last Updated:** November 29, 2025  
**Version:** 1.0.0
