# 🚀 QUICK START GUIDE

## **IMMEDIATE NEXT STEPS**

### **1. Run the Database Migration** ⚠️ REQUIRED

You MUST run this migration before testing the application.

#### **Using Supabase Dashboard (Easiest):**

1. **Open Supabase Dashboard**:
   - Go to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the Migration**:
   - Open the file: `supabase/migrations/20251129000000_setup_department_onboarding_workflow.sql`
   - Copy ALL the contents (Ctrl+A, Ctrl+C)

4. **Paste and Run**:
   - Paste into the SQL Editor
   - Click "Run" button
   - Wait for "Success" message

5. **Verify**:
   - Click "Table Editor" in sidebar
   - Check that you see:
     - ✅ `department_signup_forms`
     - ✅ `department_signup_form_submissions`
     - ✅ `departments` (should have 6 rows: IT, Sales, Marketing, HR, Finance, Operations)

---

### **2. Test the Application**

The app should already be running on: http://localhost:8081/

If not, run:
```bash
npm run dev
```

---

## **TEST SCENARIOS**

### **Scenario 1: IT Department Employee**

1. **Sign Up**:
   - Go to: http://localhost:8081/auth
   - Click "Sign Up" tab
   - Fill in:
     - Full Name: "John Doe"
     - Email: "john.it@company.com"
     - Password: "password123"
     - Phone: "+1 234 567 8900"
     - Department: **IT**
   - Click "Sign Up"

2. **Onboarding**:
   - You'll be redirected to `/onboarding`
   - See "IT Department Onboarding" form
   - Fill in:
     - Full Name (auto-filled)
     - Phone Number (auto-filled)
     - Technical Skills (type something)
     - Upload Offer Letter (PDF or DOCX)
     - Upload Resume (PDF or DOCX)
   - Click "Submit Form"

3. **See Pending Status**:
   - You should see "Submission Under Review" screen
   - Note the submission date

---

### **Scenario 2: Sales Department Employee**

1. **Sign Up**:
   - Email: "jane.sales@company.com"
   - Department: **Sales**

2. **Onboarding**:
   - See "Sales Department Onboarding" form
   - Notice different requirements:
     - **Video Pitch** (MP4/MOV/AVI, max 50MB) ⭐
     - Resume
     - Sales Experience text

---

### **Scenario 3: Admin Approval/Rejection**

1. **Login as Admin**:
   - You need an admin account
   - Sign in at `/auth`

2. **Go to Submissions**:
   - Navigate to Dashboard
   - Click "Submissions" tab

3. **Approve a Submission**:
   - Find John Doe's submission
   - Status should be "Pending"
   - Click three dots (⋮) → "View Details"
   - Click "Approve Submission"
   - Success!

4. **Reject a Submission**:
   - Find Jane's submission
   - Click three dots (⋮) → "Reject"
   - Enter reason: "Please upload a professional video pitch showing your sales skills"
   - Click "Reject Submission"

5. **Verify Rejection**:
   - Logout from admin
   - Login as jane.sales@company.com
   - Should see `/onboarding` with RED ALERT showing rejection reason
   - Can fix and resubmit

---

## **VERIFICATION CHECKLIST**

After running migration, verify in Supabase Dashboard:

### **Tables Created:**
- [ ] `department_signup_forms` exists
- [ ] `department_signup_form_submissions` exists

### **Departments Created:**
- [ ] IT
- [ ] Sales
- [ ] Marketing
- [ ] HR
- [ ] Finance
- [ ] Operations

### **Forms Created:**
Check `department_signup_forms` table should have 6 rows (one per department).

---

## **TROUBLESHOOTING**

### **Error: "Table does not exist"**
- **Solution**: Run the migration from Step 1

### **Error: "Department not found"**
- **Solution**: Check that migration created all 6 departments

### **Can't upload files**
- **Solution**: 
  1. Go to Supabase Dashboard → Storage
  2. Check if `documents` bucket exists
  3. If not, create it manually

### **Admin can't see submissions**
- **Solution**: 
  1. Verify user has admin role in `user_roles` table
  2. Run this SQL:
     ```sql
     INSERT INTO user_roles (user_id, role) 
     VALUES ('YOUR_USER_ID_HERE', 'admin');
     ```

---

## **FEATURES TO TEST**

### **Employee Features:**
- [ ] Sign up with different departments
- [ ] See department-specific forms
- [ ] Upload different file types
- [ ] Save draft
- [ ] Submit form
- [ ] See pending status
- [ ] Get rejected and see reason
- [ ] Resubmit after rejection
- [ ] Get approved and access dashboard

### **Admin Features:**
- [ ] View all submissions
- [ ] Filter by department
- [ ] Filter by status (pending/approved/rejected)
- [ ] Search by employee name
- [ ] View submission details
- [ ] Download uploaded files
- [ ] Approve submission
- [ ] Reject submission with reason

---

## **NEXT DEMO PREPARATION**

Before showing to client/manager:

1. ✅ Run migration
2. ✅ Create test accounts:
   - 1 IT employee
   - 1 Sales employee
   - 1 Admin account
3. ✅ Test full workflow (signup → onboarding → approval)
4. ✅ Have sample documents ready (PDFs, video file)

---

## **IMPORTANT NOTES**

- **Video uploads for Sales**: Make sure test video file is < 50MB
- **File formats**: The system validates file types strictly
- **Admin account**: You need to manually set a user as admin in the database
- **Storage**: Files are stored in Supabase Storage `documents` bucket

---

## **CONTACT FOR ISSUES**

If something doesn't work:
1. Check browser console (F12) for errors
2. Check Supabase logs in dashboard
3. Verify migration ran successfully
4. Check that RLS policies are enabled

---

**Good luck with your demo! 🎉**
