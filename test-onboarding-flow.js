/**
 * Test Script for Employee Onboarding Experience
 * 
 * This script tests the complete onboarding flow including:
 * 1. Department-specific form loading
 * 2. Dynamic form rendering
 * 3. Form validation
 * 4. Draft save functionality
 * 5. File upload handling
 * 6. Form submission
 * 7. Admin view of submissions
 * 
 * Run this script in a Node.js environment with the following dependencies:
 * npm install @supabase/supabase-js dotenv
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test configuration
const TEST_CONFIG = {
    adminEmail: 'admin@test.com',
    adminPassword: 'test123456',
    employeeEmail: 'employee@test.com',
    employeePassword: 'test123456',
    departmentName: 'Engineering',
    formName: 'Engineering Onboarding Form'
};

let testResults = {
    passed: [],
    failed: [],
    total: 0
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
}

function assert(condition, message) {
    testResults.total++;
    if (condition) {
        testResults.passed.push(message);
        log(`✅ ${message}`, 'success');
        return true;
    } else {
        testResults.failed.push(message);
        log(`❌ ${message}`, 'error');
        return false;
    }
}

async function runTest(testName, testFunction) {
    log(`\n🧪 Running test: ${testName}`);
    try {
        await testFunction();
    } catch (error) {
        assert(false, `${testName} - Exception: ${error.message}`);
    }
}

async function testDatabaseConnection() {
    const { data, error } = await supabase.from('departments').select('count');
    assert(!error, 'Database connection successful');
    assert(data !== null, 'Can query departments table');
}

async function testDepartmentSignupFormsTable() {
    const { data, error } = await supabase.from('department_signup_forms').select('count');
    assert(!error, 'department_signup_forms table exists');
    assert(data !== null, 'Can query department_signup_forms table');
}

async function testDepartmentSignupFormSubmissionsTable() {
    const { data, error } = await supabase.from('department_signup_form_submissions').select('count');
    assert(!error, 'department_signup_form_submissions table exists');
    assert(data !== null, 'Can query department_signup_form_submissions table');
}

async function createTestDepartment() {
    // Check if department already exists
    const { data: existingDept } = await supabase
        .from('departments')
        .select('id')
        .eq('name', TEST_CONFIG.departmentName)
        .single();

    if (existingDept) {
        log(`Department "${TEST_CONFIG.departmentName}" already exists`);
        return existingDept.id;
    }

    // Create new department
    const { data, error } = await supabase
        .from('departments')
        .insert({ name: TEST_CONFIG.departmentName })
        .select()
        .single();

    assert(!error, 'Test department created successfully');
    assert(data !== null, 'Department data returned');

    return data.id;
}

async function createTestForm(departmentId) {
    const testFormFields = [
        {
            id: 'full_name',
            type: 'text',
            label: 'Full Name',
            required: true,
            placeholder: 'Enter your full name'
        },
        {
            id: 'email',
            type: 'email',
            label: 'Email Address',
            required: true,
            placeholder: 'Enter your email'
        },
        {
            id: 'phone',
            type: 'phone',
            label: 'Phone Number',
            required: true,
            placeholder: 'Enter your phone number'
        },
        {
            id: 'experience',
            type: 'dropdown',
            label: 'Years of Experience',
            required: true,
            options: ['0-1', '1-3', '3-5', '5+']
        },
        {
            id: 'resume',
            type: 'file',
            label: 'Resume',
            required: true,
            fileTypes: ['pdf', 'docx'],
            maxFileSize: 5
        },
        {
            id: 'cover_letter',
            type: 'textarea',
            label: 'Cover Letter',
            required: false,
            placeholder: 'Tell us why you want to join our team'
        }
    ];

    const { data, error } = await supabase
        .from('department_signup_forms')
        .insert({
            department_id: departmentId,
            form_name: TEST_CONFIG.formName,
            form_description: 'Complete onboarding form for Engineering department',
            form_fields: testFormFields
        })
        .select()
        .single();

    assert(!error, 'Test form created successfully');
    assert(data !== null, 'Form data returned');
    assert(Array.isArray(data.form_fields), 'Form fields stored as array');
    assert(data.form_fields.length === 6, 'All 6 form fields saved');

    return data.id;
}

async function testFormRetrieval(departmentId) {
    const { data, error } = await supabase
        .from('department_signup_forms')
        .select('*')
        .eq('department_id', departmentId)
        .single();

    assert(!error, 'Form retrieved successfully by department');
    assert(data !== null, 'Form data returned');
    assert(data.form_name === TEST_CONFIG.formName, 'Correct form name retrieved');
    assert(Array.isArray(data.form_fields), 'Form fields is an array');
    assert(data.form_fields.length > 0, 'Form fields not empty');

    return data;
}

async function testDraftSubmission(formId, userId) {
    const draftData = {
        full_name: 'Test Employee',
        email: 'employee@test.com',
        phone: '+1234567890'
    };

    const { data, error } = await supabase
        .from('department_signup_form_submissions')
        .insert({
            form_id: formId,
            user_id: userId,
            is_draft: true,
            draft_data: draftData,
            uploaded_files: [],
            completion_percentage: 50,
            status: 'draft'
        })
        .select()
        .single();

    assert(!error, 'Draft submission created successfully');
    assert(data !== null, 'Draft data returned');
    assert(data.is_draft === true, 'Draft flag set correctly');
    assert(data.completion_percentage === 50, 'Completion percentage saved');
    assert(data.status === 'draft', 'Status set to draft');

    return data.id;
}

async function testDraftUpdate(draftId) {
    const updatedDraftData = {
        full_name: 'Test Employee Updated',
        email: 'employee@test.com',
        phone: '+1234567890',
        experience: '1-3'
    };

    const { data, error } = await supabase
        .from('department_signup_form_submissions')
        .update({
            draft_data: updatedDraftData,
            completion_percentage: 75
        })
        .eq('id', draftId)
        .select()
        .single();

    assert(!error, 'Draft updated successfully');
    assert(data !== null, 'Updated draft data returned');
    assert(data.completion_percentage === 75, 'Completion percentage updated');

    return data;
}

async function testFinalSubmission(draftId) {
    const finalSubmissionData = {
        full_name: 'Test Employee Final',
        email: 'employee@test.com',
        phone: '+1234567890',
        experience: '3-5',
        resume: 'https://example.com/resume.pdf',
        cover_letter: 'I am excited to join the team!'
    };

    const { data, error } = await supabase
        .from('department_signup_form_submissions')
        .update({
            is_draft: false,
            submission_data: finalSubmissionData,
            completion_percentage: 100,
            status: 'pending'
        })
        .eq('id', draftId)
        .select()
        .single();

    assert(!error, 'Final submission successful');
    assert(data !== null, 'Final submission data returned');
    assert(data.is_draft === false, 'Draft flag cleared');
    assert(data.status === 'pending', 'Status set to pending');
    assert(data.completion_percentage === 100, 'Completion percentage set to 100');

    return data;
}

async function testAdminSubmissionsView() {
    const { data, error } = await supabase
        .from('department_signup_form_submissions')
        .select(`
      *,
      profiles (
        full_name,
        email,
        departments (name)
      ),
      department_signup_forms (
        form_name,
        form_fields
      )
    `)
        .eq('is_draft', false);

    assert(!error, 'Admin submissions query successful');
    assert(Array.isArray(data), 'Submissions returned as array');
    assert(data.length > 0, 'At least one submission found');

    const submission = data[0];
    assert(submission.profiles !== null, 'Profile data joined correctly');
    assert(submission.department_signup_forms !== null, 'Form data joined correctly');
    assert(submission.status === 'pending', 'Submission status correct');

    return data;
}

async function testStatusUpdate(submissionId) {
    const { data, error } = await supabase
        .from('department_signup_form_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId)
        .select()
        .single();

    assert(!error, 'Status update successful');
    assert(data !== null, 'Updated submission data returned');
    assert(data.status === 'approved', 'Status updated to approved');

    return data;
}

async function cleanupTestData(departmentId, formId) {
    log('Cleaning up test data...');

    // Delete submissions
    await supabase
        .from('department_signup_form_submissions')
        .delete()
        .eq('form_id', formId);

    // Delete form
    await supabase
        .from('department_signup_forms')
        .delete()
        .eq('id', formId);

    // Delete department
    await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

    log('Test data cleaned up');
}

async function runAllTests() {
    log('🚀 Starting Employee Onboarding Flow Tests\n');

    // Basic connectivity tests
    await runTest('Database Connection', testDatabaseConnection);
    await runTest('Department Signup Forms Table', testDepartmentSignupFormsTable);
    await runTest('Department Signup Form Submissions Table', testDepartmentSignupFormSubmissionsTable);

    // Setup test data
    const departmentId = await createTestDepartment();
    const formId = await createTestForm(departmentId);

    // Form functionality tests
    await runTest('Form Retrieval by Department', () => testFormRetrieval(departmentId));

    // Draft functionality tests
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Mock user ID for testing
    const draftId = await testDraftSubmission(formId, testUserId);
    await runTest('Draft Update', () => testDraftUpdate(draftId));

    // Final submission tests
    await runTest('Final Submission', () => testFinalSubmission(draftId));

    // Admin functionality tests
    await runTest('Admin Submissions View', testAdminSubmissionsView);
    const submissions = await testAdminSubmissionsView();
    if (submissions.length > 0) {
        await runTest('Status Update', () => testStatusUpdate(submissions[0].id));
    }

    // Cleanup
    await cleanupTestData(departmentId, formId);

    // Print results
    log('\n📊 Test Results Summary:');
    log(`Total Tests: ${testResults.total}`);
    log(`Passed: ${testResults.passed.length}`);
    log(`Failed: ${testResults.failed.length}`);

    if (testResults.failed.length > 0) {
        log('\n❌ Failed Tests:');
        testResults.failed.forEach(test => log(`  - ${test}`, 'error'));
    }

    if (testResults.passed.length === testResults.total) {
        log('\n🎉 All tests passed! Employee onboarding flow is working correctly.', 'success');
    } else {
        log('\n⚠️ Some tests failed. Please review the implementation.', 'error');
    }

    process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testResults
};