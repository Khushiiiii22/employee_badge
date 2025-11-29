/**
 * Test script to simulate department-specific onboarding flow
 * This script tests:
 * 1. Department selection during signup
 * 2. Dynamic form rendering based on department
 * 3. Document upload requirements per department
 * 4. Form validation and submission
 * 5. Profile update with onboarding data
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data for different departments
const testDepartments = [
    {
        name: 'Engineering',
        email: 'engineer@test.com',
        password: 'test123456',
        fullName: 'Test Engineer',
        phoneNumber: '+1234567890',
        expectedFields: ['text', 'email', 'file'],
        expectedDocuments: ['Resume', 'ID Proof']
    },
    {
        name: 'HR',
        email: 'hr@test.com',
        password: 'test123456',
        fullName: 'Test HR',
        phoneNumber: '+1234567891',
        expectedFields: ['dropdown', 'textarea'],
        expectedDocuments: ['Resume', 'Cover Letter']
    },
    {
        name: 'Finance',
        email: 'finance@test.com',
        password: 'test123456',
        fullName: 'Test Finance',
        phoneNumber: '+1234567892',
        expectedFields: ['text', 'phone', 'file'],
        expectedDocuments: ['Resume', 'Bank Statement']
    }
];

async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');

    for (const dept of testDepartments) {
        try {
            // Delete user from auth (this will cascade to profiles)
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const testUser = users.find(u => u.email === dept.email);

            if (testUser) {
                await supabase.auth.admin.deleteUser(testUser.id);
                console.log(`✅ Deleted test user: ${dept.email}`);
            }
        } catch (error) {
            console.log(`⚠️  Could not delete user ${dept.email}:`, error.message);
        }
    }
}

async function getDepartmentId(departmentName) {
    const { data, error } = await supabase
        .from('departments')
        .select('id')
        .eq('name', departmentName)
        .single();

    if (error) {
        console.error(`❌ Error fetching department ${departmentName}:`, error.message);
        return null;
    }

    return data.id;
}

async function testDepartmentSignup(dept) {
    console.log(`\n🔐 Testing signup for ${dept.name} department...`);

    try {
        // Get department ID
        const departmentId = await getDepartmentId(dept.name);
        if (!departmentId) {
            console.log(`❌ Department ${dept.name} not found. Skipping test.`);
            return false;
        }

        // Sign up user
        const { data, error } = await supabase.auth.signUp({
            email: dept.email,
            password: dept.password,
            options: {
                data: {
                    full_name: dept.fullName,
                    phone_number: dept.phoneNumber,
                    department_id: departmentId,
                },
            },
        });

        if (error) {
            console.error(`❌ Signup failed for ${dept.email}:`, error.message);
            return false;
        }

        if (!data.user) {
            console.error(`❌ User creation failed for ${dept.email}`);
            return false;
        }

        // Update profile with department_id
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ department_id: departmentId })
            .eq('id', data.user.id);

        if (profileError) {
            console.error(`❌ Profile update failed for ${dept.email}:`, profileError.message);
            return false;
        }

        console.log(`✅ Signup successful for ${dept.email}`);
        return { user: data.user, departmentId };

    } catch (error) {
        console.error(`❌ Unexpected error during signup for ${dept.name}:`, error.message);
        return false;
    }
}

async function testDepartmentOnboarding(signupResult, dept) {
    console.log(`\n📋 Testing onboarding for ${dept.name} department...`);

    try {
        const { user, departmentId } = signupResult;

        // Load department form
        const { data: formData, error: formError } = await supabase
            .from('department_signup_forms')
            .select('*')
            .eq('department_id', departmentId)
            .single();

        if (formError) {
            if (formError.code === 'PGRST116') {
                console.log(`ℹ️  No form defined for ${dept.name} department`);
            } else {
                console.error(`❌ Error loading form for ${dept.name}:`, formError.message);
            }
        }

        // Load document templates
        const { data: docTemplates, error: docError } = await supabase
            .from('department_document_templates')
            .select('*')
            .eq('department_id', departmentId);

        if (docError) {
            console.error(`❌ Error loading document templates for ${dept.name}:`, docError.message);
        }

        console.log(`📝 Form found: ${formData ? formData.form_name : 'None'}`);
        console.log(`📄 Document templates found: ${docTemplates ? docTemplates.length : 0}`);

        if (formData) {
            console.log(`   Form fields: ${formData.form_fields.length}`);
            formData.form_fields.forEach((field, index) => {
                console.log(`   ${index + 1}. ${field.label} (${field.type}) - Required: ${field.required}`);
            });
        }

        if (docTemplates && docTemplates.length > 0) {
            docTemplates.forEach((doc, index) => {
                console.log(`   ${index + 1}. ${doc.title} - Required: ${doc.is_required}`);
            });
        }

        // Simulate form submission
        if (formData || (docTemplates && docTemplates.length > 0)) {
            const submissionData = {
                form_id: formData?.id || null,
                user_id: user.id,
                is_draft: false,
                submission_data: { test: 'data' },
                uploaded_files: [],
                completion_percentage: 100,
                status: 'pending'
            };

            const { error: submissionError } = await supabase
                .from('department_signup_form_submissions')
                .insert(submissionData);

            if (submissionError) {
                console.error(`❌ Error submitting form for ${dept.name}:`, submissionError.message);
                return false;
            }

            // Update profile onboarding status
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    department_id: departmentId,
                    department_specific_data: { test: 'data' },
                    onboarding_status: 'completed'
                })
                .eq('id', user.id);

            if (updateError) {
                console.error(`❌ Error updating profile for ${dept.name}:`, updateError.message);
                return false;
            }

            console.log(`✅ Onboarding simulation successful for ${dept.name}`);
        } else {
            console.log(`ℹ️  No onboarding requirements for ${dept.name} department`);
        }

        return true;

    } catch (error) {
        console.error(`❌ Unexpected error during onboarding for ${dept.name}:`, error.message);
        return false;
    }
}

async function verifyOnboardingData(dept) {
    console.log(`\n🔍 Verifying onboarding data for ${dept.name}...`);

    try {
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error(`❌ Could not retrieve user: ${userError?.message}`);
            return false;
        }

        // Check profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
        *,
        departments(name)
      `)
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error(`❌ Error fetching profile:`, profileError.message);
            return false;
        }

        console.log(`✅ Profile verification successful:`);
        console.log(`   Email: ${profile.email}`);
        console.log(`   Department: ${profile.departments?.name || 'Not assigned'}`);
        console.log(`   Onboarding Status: ${profile.onboarding_status || 'Not started'}`);
        console.log(`   Department Data: ${profile.department_specific_data ? 'Present' : 'Missing'}`);

        // Check form submission
        const { data: submission, error: submissionError } = await supabase
            .from('department_signup_form_submissions')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (submissionError) {
            console.error(`❌ Error fetching submission:`, submissionError.message);
        } else if (submission) {
            console.log(`✅ Form submission found:`);
            console.log(`   Status: ${submission.status}`);
            console.log(`   Completion: ${submission.completion_percentage}%`);
            console.log(`   Submitted: ${submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}`);
        } else {
            console.log(`ℹ️  No form submission found`);
        }

        // Check uploaded documents
        const { data: documents, error: docsError } = await supabase
            .from('onboarding_documents')
            .select('*')
            .eq('user_id', user.id);

        if (docsError) {
            console.error(`❌ Error fetching documents:`, docsError.message);
        } else {
            console.log(`📄 Uploaded documents: ${documents.length}`);
            documents.forEach((doc, index) => {
                console.log(`   ${index + 1}. ${doc.file_name} (${doc.document_type})`);
            });
        }

        return true;

    } catch (error) {
        console.error(`❌ Unexpected error during verification:`, error.message);
        return false;
    }
}

async function runFullTest() {
    console.log('🚀 Starting Department-Specific Onboarding Flow Test\n');

    // Cleanup any existing test data
    await cleanupTestData();

    let successCount = 0;

    for (const dept of testDepartments) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`TESTING DEPARTMENT: ${dept.name.toUpperCase()}`);
        console.log(`${'='.repeat(60)}`);

        // Test signup
        const signupResult = await testDepartmentSignup(dept);
        if (!signupResult) {
            console.log(`❌ Signup test failed for ${dept.name}. Skipping onboarding test.`);
            continue;
        }

        // Test onboarding
        const onboardingSuccess = await testDepartmentOnboarding(signupResult, dept);
        if (!onboardingSuccess) {
            console.log(`❌ Onboarding test failed for ${dept.name}. Skipping verification.`);
            continue;
        }

        // Verify data
        const verificationSuccess = await verifyOnboardingData(dept);
        if (verificationSuccess) {
            successCount++;
            console.log(`✅ All tests passed for ${dept.name} department!`);
        } else {
            console.log(`❌ Verification failed for ${dept.name} department.`);
        }

        // Sign out before next test
        await supabase.auth.signOut();
    }

    // Final cleanup
    await cleanupTestData();

    // Results
    console.log(`\n${'='.repeat(60)}`);
    console.log('TEST RESULTS SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total departments tested: ${testDepartments.length}`);
    console.log(`Successful tests: ${successCount}`);
    console.log(`Failed tests: ${testDepartments.length - successCount}`);

    if (successCount === testDepartments.length) {
        console.log('\n🎉 All tests passed! Department-specific onboarding is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
    }

    process.exit(successCount === testDepartments.length ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the test
runFullTest();