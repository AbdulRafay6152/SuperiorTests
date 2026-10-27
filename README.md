# GGDC Tests - Production Ready

A professional online testing platform built with React, TypeScript, Firebase Firestore, and Tailwind CSS. Fully cloud-based with no local storage dependencies.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** (Email/Password)
4. Create a **Firestore Database**
5. Get your Firebase config from Project Settings
6. Update `src/firebase.ts` with your config values

### 3. Set Firestore Security Rules
Copy the rules from `DEPLOYMENT_GUIDE.md` section 4 into your Firestore security rules.

### 4. Run Development Server
```bash
npm run dev
```
Open http://localhost:5173

### 5. Build for Production
```bash
npm run build
```

## 📦 Deployment Options

### Option 1: GitHub Pages (Free)
See `DEPLOYMENT_GUIDE.md` for complete GitHub Pages setup with GitHub Actions.

### Option 2: Vercel (Recommended - Easiest)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel auto-detects Vite and deploys

### Option 3: Netlify (Free)
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import repository
4. Build command: `npm run build`
5. Publish directory: `dist`

### Option 4: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Database**: Firebase Firestore (NoSQL, real-time sync)
- **Authentication**: Firebase Auth
- **Icons**: Lucide React
- **Math Rendering**: KaTeX
- **PDF Export**: jsPDF

### Key Features
✅ 8 question types (Multiple Choice, True/False, Fill-in-Blank, Short Answer, Essay, Numeric, Matching, Multi-Select)
✅ Two-step test access (verification → identity collection)
✅ Father's name collection for student identification
✅ Anti-cheat controls (8 independently toggleable features)
✅ Timed assessments with auto-submit
✅ Passcode / email whitelist / student ID access modes
✅ PDF and CSV result exports
✅ Dark/light theme toggle
✅ KaTeX math rendering in questions
✅ Bulk question import
✅ Real-time cloud sync across devices
✅ Professional Testmoz-inspired UI

### Data Flow
```
User Action → firestoreStore.ts → Firebase Firestore
                                    ↓
                              Real-time Sync
                                    ↓
                          React Components Update
```

### File Structure
```
src/
├── firebase.ts              # Firebase configuration
├── firestoreStore.ts        # All database operations (async)
├── AuthContext.tsx           # Authentication state management
├── types.ts                 # TypeScript type definitions
├── App.tsx                  # Main app with routing
├── index.css                # Global styles + Tailwind
├── components/
│   └── Layout.tsx           # App shell (header, navigation)
├── pages/
│   ├── Landing.tsx          # Public landing page
│   ├── Login.tsx            # Email/password login
│   ├── Signup.tsx           # Account creation
│   ├── Dashboard.tsx        # Teacher's test list
│   ├── TestEditor.tsx       # Create/edit tests
│   ├── TestSettings.tsx     # Test configuration
│   ├── TestTake.tsx         # Student test-taking interface
│   ├── Results.tsx          # Results overview table
│   ├── ResultDetail.tsx     # Individual student results
│   ├── Profile.tsx          # User profile settings
│   └── ResetPassword.tsx    # Password reset flow
└── utils/
    └── pdf.ts               # PDF/CSV export utilities
```

## 🔐 Security

### Authentication
- Firebase Auth with email/password
- Secure token-based sessions
- Protected routes with AuthContext

### Firestore Rules
- Users can only read/write their own data
- Tests are readable by anyone (for test-taking)
- Tests can only be modified by their owner
- Attempts are publicly writable (for test submission)

### Best Practices
✅ Never commit `.env` files
✅ Use environment variables for Firebase config in production
✅ Enable Firebase App Check for additional security
✅ Monitor Firestore usage in Firebase Console
✅ Set up Firebase Auth email templates

## 🎨 Design System

### Colors
- **Primary**: `#284B63` (Deep Blue)
- **Accent**: `#3C6E71` (Teal)
- **Light Mode**: White background, dark text
- **Dark Mode**: Dark background, light text

### Typography
- **Headings**: Fira Sans (Medium, Semibold, Bold)
- **Body**: Fira Sans (Regular, Medium)
- **Monospace**: JetBrains Mono (for IDs, codes)

### Design Principles
- Professional, academic aesthetic
- Testmoz-inspired clean UI
- Dense but readable information display
- Consistent spacing (4px/8px grid)
- Minimal border radius (3px)
- Uppercase table headers
- Compact components

## 📊 Database Schema

### Collections

#### `users/{uid}`
```typescript
{
  name: string;
  email: string;
  createdAt: string;
}
```

#### `tests/{testId}`
```typescript
{
  ownerId: string;
  slug: string;
  settings: TestSettings;
  questions: Question[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### `attempts/{attemptId}`
```typescript
{
  testId: string;
  takerName: string;
  takerFatherName: string;
  takerEmail: string;
  takerStudentId: string;
  attemptNumber: number;
  answers: Answer[];
  score: number | null;
  maxScore: number;
  percentage: number | null;
  startedAt: string;
  submittedAt: string | null;
  timeTakenSeconds: number | null;
  status: 'in-progress' | 'submitted' | 'paused' | 'expired';
  antiCheatEvents: AntiCheatEvent[];
}
```

## 🧪 Testing the Application

### Teacher Workflow
1. Sign up / Log in
2. Create a new test
3. Add questions (various types)
4. Configure settings (time limit, access mode, anti-cheat)
5. Publish the test
6. Share the test link with students
7. View results and export reports

### Student Workflow
1. Open test link (no account needed)
2. **Step 1**: Enter verification info (email/passcode/student ID based on teacher settings)
3. **Step 2**: Enter name and father's name
4. Take the test
5. Submit and see results (if enabled by teacher)

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Adding New Features
1. Add types to `types.ts`
2. Add Firestore operations to `firestoreStore.ts`
3. Create page component in `pages/`
4. Add route in `App.tsx`

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Async/await for all Firestore operations
- Consistent error handling
- Loading states for all async operations

## 📝 Environment Variables

For production deployments, create a `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Important**: Never commit `.env` to version control!

## 🐛 Troubleshooting

### "Missing or insufficient permissions"
- Check Firestore security rules
- Verify user is authenticated
- Check document ownership

### Blank page after deployment
- Ensure SPA routing is configured (see deployment guide)
- Check browser console for errors
- Verify Firebase config is correct

### Login not working
- Verify Email/Password auth is enabled in Firebase
- Check Firebase Console → Authentication → Users
- Verify Firebase config values are correct

### Tests not loading
- Check browser console for Firestore errors
- Verify Firestore database is created
- Check security rules allow read access

### Build fails
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors in terminal

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev)

## 📄 License

MIT License - feel free to use for any purpose.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `DEPLOYMENT_GUIDE.md` for detailed setup instructions
3. Check browser console for error messages
4. Verify Firebase configuration is correct

---

**Built for colleges that need reliability, not gimmicks.** 🎓
