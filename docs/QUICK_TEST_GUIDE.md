# 🧪 QUICK TEST GUIDE

## ✅ **Test the Complete Onboarding Flow**

### **🎯 Test 1: New User Signup (3 minutes)**

1. **Clear your browser data** (important!)
   - Logout if logged in
   - Or use incognito window

2. **Sign up as a new IT employee**
   - Go to: http://localhost:8081/auth
   - Click "Sign Up"
   - Email: `john.it@test.com`
   - Password: `Test123!`
   - Department: **IT**
   - Click "Sign Up"

3. **✅ EXPECTED: Redirected to `/onboarding`**
   - Should see: "IT Department Onboarding"
   - Form should have:
     - Full Name
     - Phone Number
     - Offer Letter upload
     - Resume/CV upload
     - Technical Skills textarea

4. **Fill the form**
   - Full Name: `John Doe`
   - Phone: `+1 234 567 8900`
   - Upload any PDF for Offer Letter
   - Upload any PDF for Resume
   - Skills: `JavaScript, React, Node.js`

5. **Click "Submit Application"**
   - ✅ Should show success message
   - ✅ Should see "Waiting for Admin Approval" screen
   - ✅ Status badge should say "PENDING"

6. **Try to access dashboard**
   - Manually go to: http://localhost:8081/dashboard
   - ✅ Should be redirected back to `/onboarding`
   - ✅ Should still see "Pending" status

---

### **🎯 Test 2: Admin Approval (2 minutes)**

1. **Logout and login as admin**
   - Email: `khushi.cai12@gmail.com`
   - Password: `admin12`

2. **Go to Submissions tab**
   - Click "Submissions" in the dashboard
   - ✅ Should see John Doe's submission
   - ✅ Status should be "pending"
   - ✅ Department should be "IT"

3. **View the submission**
   - Click "View Details" on John's submission
   - ✅ Should see all uploaded files
   - ✅ Should see form data

4. **Approve the submission**
   - Click "Approve" button
   - ✅ Should see success message
   - ✅ Submission should disappear from pending list

---

### **🎯 Test 3: Approved User Access (1 minute)**

1. **Logout and login as John**
   - Email: `john.it@test.com`
   - Password: `Test123!`

2. **✅ EXPECTED: Go to Dashboard**
   - Should automatically go to `/dashboard`
   - Should see Employee Dashboard
   - Should NOT see admin tabs

3. **Verify full access**
   - ✅ Can see training sessions
   - ✅ Can see documents
   - ✅ Can navigate freely

---

### **🎯 Test 4: Rejection & Resubmission (3 minutes)**

1. **Create another test user (Sales dept)**
   - Logout
   - Sign up: `jane.sales@test.com` / `Test123!`
   - Department: **Sales**
   - Submit Sales form (Video Pitch + Resume)

2. **Admin rejects with reason**
   - Login as admin
   - Go to Submissions
   - View Jane's submission
   - Click "Reject"
   - Reason: `Video pitch is too short. Please record a 60-second pitch.`
   - Click "Confirm Reject"

3. **User sees rejection**
   - Logout and login as `jane.sales@test.com`
   - ✅ Should go to `/onboarding`
   - ✅ Should see RED alert: "Your submission was rejected"
   - ✅ Should see rejection reason
   - ✅ Form should be pre-filled with previous data

4. **Resubmit**
   - Upload new video
   - Click "Submit Application"
   - ✅ Status should go back to "pending"
   - ✅ Should see "Waiting for approval" screen

---

## 📊 **STATUS SUMMARY**

### **User Status Meanings:**

| Status | User Sees | Can Access Dashboard? | What To Do |
|--------|-----------|----------------------|------------|
| **NULL** (first time) | Onboarding form | ❌ No | Fill and submit |
| **pending** | "Waiting for approval" | ❌ No | Wait for admin |
| **rejected** | Rejection alert + form | ❌ No | Fix and resubmit |
| **verified** | Dashboard | ✅ Yes | Normal access |
| **Admin** | Dashboard | ✅ Yes | Always has access |

---

## ✅ **SUCCESS CRITERIA**

All tests should pass:
- ✅ New signups go to onboarding (not dashboard)
- ✅ Pending users cannot access dashboard
- ✅ Approved users can access dashboard
- ✅ Rejected users see rejection reason
- ✅ Rejected users can resubmit
- ✅ Admins always have full access
- ✅ Each department sees their specific form fields

---

## 🚨 **If Tests Fail:**

1. **Hard refresh browser** (Cmd+Shift+R)
2. **Clear all site data** for localhost
3. **Check migration ran** in Supabase
4. **Verify admin was created** in Supabase
5. **Check browser console** for errors

---

**Run these tests to verify everything works!** 🚀
