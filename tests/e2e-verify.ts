import supertest from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

async function cleanupUser(supabaseId: string, email: string) {
  try {
    console.log(`Cleaning up user: ${email} (${supabaseId})`);
    
    // Find local user
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Delete push tokens
      await prisma.pushToken.deleteMany({ where: { userId: user.id } });
      
      // Delete meals and items
      const meals = await prisma.meal.findMany({ where: { studentId: user.id } });
      for (const meal of meals) {
        await prisma.mealItem.deleteMany({ where: { mealId: meal.id } });
      }
      await prisma.meal.deleteMany({ where: { studentId: user.id } });

      // Delete workout completions
      await prisma.workoutCompletion.deleteMany({ where: { studentId: user.id } });

      // Delete weekly plans, day plans, exercises
      const plans = await prisma.weeklyPlan.findMany({
        where: {
          OR: [{ studentId: user.id }, { professorId: user.id }]
        }
      });
      for (const plan of plans) {
        const dayPlans = await prisma.dayPlan.findMany({ where: { weeklyPlanId: plan.id } });
        for (const dp of dayPlans) {
          await prisma.exercise.deleteMany({ where: { dayPlanId: dp.id } });
        }
        await prisma.dayPlan.deleteMany({ where: { weeklyPlanId: plan.id } });
      }
      await prisma.weeklyPlan.deleteMany({
        where: {
          OR: [{ studentId: user.id }, { professorId: user.id }]
        }
      });

      // Delete enrollments and invite codes
      await prisma.enrollment.deleteMany({
        where: {
          OR: [{ studentId: user.id }, { professorId: user.id }]
        }
      });
      await prisma.inviteCode.deleteMany({ where: { professorId: user.id } });

      // Finally delete the user
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Local user ${email} deleted successfully.`);
    }
  } catch (error) {
    console.error(`Error cleaning up user ${email}:`, error);
  }
}

async function runTests() {
  console.log('--- STARTING E2E INTEGRATION & SECURITY TESTS ---');
  await app.ready();
  const request = supertest(app.server);

  const randomId = Math.floor(Math.random() * 1000000);
  const professorEmail = `e2e.prof.${randomId}@peaktime.com`;
  const studentEmail = `e2e.stud.${randomId}@peaktime.com`;
  const password = 'PasswordE2E123!';

  console.log(`Generating test accounts:\n- Professor: ${professorEmail}\n- Student: ${studentEmail}\n`);

  let profToken = '';
  let studToken = '';
  let profDbId = '';
  let studDbId = '';
  let inviteCode = '';
  let weeklyPlanId = '';
  let dayPlanId = '';

  const results: { name: string; success: boolean; details?: string }[] = [];

  const addResult = (name: string, success: boolean, details?: string) => {
    results.push({ name, success, details });
    if (success) {
      console.log(`✅ [PASS] ${name}`);
    } else {
      console.error(`❌ [FAIL] ${name} - ${details}`);
    }
  };

  try {
    // ----------------------------------------------------
    // 1. REGISTER PROFESSOR
    // ----------------------------------------------------
    console.log('\nTesting: Register Professor...');
    const regProfRes = await request
      .post('/api/auth/register')
      .send({
        email: professorEmail,
        password,
        name: 'E2E Professor Name',
        phone: '+5511999999999',
        birthDate: '1985-05-15T00:00:00.000Z',
        role: 'PROFESSOR'
      });

    if (regProfRes.status === 200 && regProfRes.body.session?.access_token) {
      profToken = regProfRes.body.session.access_token;
      profDbId = regProfRes.body.user.id;
      addResult('Register Professor (POST /api/auth/register)', true);
    } else {
      addResult('Register Professor (POST /api/auth/register)', false, `Status: ${regProfRes.status}, Body: ${JSON.stringify(regProfRes.body)}`);
    }

    // ----------------------------------------------------
    // 2. REGISTER STUDENT
    // ----------------------------------------------------
    console.log('\nTesting: Register Student...');
    const regStudRes = await request
      .post('/api/auth/register')
      .send({
        email: studentEmail,
        password,
        name: 'E2E Student Name',
        phone: '+5511888888888',
        birthDate: '2000-10-20T00:00:00.000Z',
        role: 'ALUNO'
      });

    if (regStudRes.status === 200 && regStudRes.body.session?.access_token) {
      studToken = regStudRes.body.session.access_token;
      studDbId = regStudRes.body.user.id;
      addResult('Register Student (POST /api/auth/register)', true);
    } else {
      addResult('Register Student (POST /api/auth/register)', false, `Status: ${regStudRes.status}, Body: ${JSON.stringify(regStudRes.body)}`);
    }

    // ----------------------------------------------------
    // 3. LOGIN PROFESSOR
    // ----------------------------------------------------
    console.log('\nTesting: Login Professor...');
    const loginProfRes = await request
      .post('/api/auth/login')
      .send({ email: professorEmail, password });

    if (loginProfRes.status === 200 && loginProfRes.body.access_token) {
      addResult('Login Professor (POST /api/auth/login)', true);
    } else {
      addResult('Login Professor (POST /api/auth/login)', false, `Status: ${loginProfRes.status}, Body: ${JSON.stringify(loginProfRes.body)}`);
    }

    // ----------------------------------------------------
    // 4. SECURITY: Unauthenticated Requests
    // ----------------------------------------------------
    console.log('\nTesting Security: Request without authorization header...');
    const noAuthRes = await request.get('/api/enrollment/students');
    if (noAuthRes.status === 401 && noAuthRes.body.code === 'UNAUTHORIZED') {
      addResult('Security check - Missing auth header returns 401', true);
    } else {
      addResult('Security check - Missing auth header returns 401', false, `Status: ${noAuthRes.status}, Body: ${JSON.stringify(noAuthRes.body)}`);
    }

    console.log('Testing Security: Request with invalid JWT token...');
    const badAuthRes = await request
      .get('/api/enrollment/students')
      .set('Authorization', 'Bearer invalid-token-value-abc');
    if (badAuthRes.status === 401 && badAuthRes.body.code === 'UNAUTHORIZED') {
      addResult('Security check - Invalid auth token returns 401', true);
    } else {
      addResult('Security check - Invalid auth token returns 401', false, `Status: ${badAuthRes.status}, Body: ${JSON.stringify(badAuthRes.body)}`);
    }

    // ----------------------------------------------------
    // 5. SECURITY: Role Authorization Guards
    // ----------------------------------------------------
    console.log('\nTesting Security: Student trying to generate invite (should fail)...');
    const studInviteRes = await request
      .post('/api/enrollment/invite')
      .set('Authorization', `Bearer ${studToken}`);
    if (studInviteRes.status === 403) {
      addResult('Security check - Student role restriction (403 on Professor action)', true);
    } else {
      addResult('Security check - Student role restriction (403 on Professor action)', false, `Status: ${studInviteRes.status}, Body: ${JSON.stringify(studInviteRes.body)}`);
    }

    console.log('Testing Security: Professor trying to join with invite code (should fail)...');
    const profJoinRes = await request
      .post('/api/enrollment/join')
      .set('Authorization', `Bearer ${profToken}`)
      .send({ code: 'ABC123' });
    if (profJoinRes.status === 403) {
      addResult('Security check - Professor role restriction (403 on Student action)', true);
    } else {
      addResult('Security check - Professor role restriction (403 on Student action)', false, `Status: ${profJoinRes.status}, Body: ${JSON.stringify(profJoinRes.body)}`);
    }

    // ----------------------------------------------------
    // 6. ENROLLMENT FLOW
    // ----------------------------------------------------
    console.log('\nTesting: Professor generating invite code...');
    const generateInviteRes = await request
      .post('/api/enrollment/invite')
      .set('Authorization', `Bearer ${profToken}`);

    if (generateInviteRes.status === 200 && generateInviteRes.body.code) {
      inviteCode = generateInviteRes.body.code;
      addResult('Generate Invite Code (POST /api/enrollment/invite)', true, `Code: ${inviteCode}`);
    } else {
      addResult('Generate Invite Code (POST /api/enrollment/invite)', false, `Status: ${generateInviteRes.status}, Body: ${JSON.stringify(generateInviteRes.body)}`);
    }

    console.log('\nTesting: Student joining using the generated code...');
    const joinRes = await request
      .post('/api/enrollment/join')
      .set('Authorization', `Bearer ${studToken}`)
      .send({ code: inviteCode });

    if (joinRes.status === 200) {
      addResult('Join with Invite Code (POST /api/enrollment/join)', true);
    } else {
      addResult('Join with Invite Code (POST /api/enrollment/join)', false, `Status: ${joinRes.status}, Body: ${JSON.stringify(joinRes.body)}`);
    }

    console.log('\nTesting: Professor listing their students...');
    const studentsRes = await request
      .get('/api/enrollment/students')
      .set('Authorization', `Bearer ${profToken}`);

    if (studentsRes.status === 200 && studentsRes.body.length > 0 && studentsRes.body[0].studentId === studDbId) {
      addResult('Get Professor Students (GET /api/enrollment/students)', true);
    } else {
      addResult('Get Professor Students (GET /api/enrollment/students)', false, `Status: ${studentsRes.status}, Body: ${JSON.stringify(studentsRes.body)}`);
    }

    console.log('\nTesting: Student viewing their professor...');
    const professorRes = await request
      .get('/api/enrollment/professor')
      .set('Authorization', `Bearer ${studToken}`);

    if (professorRes.status === 200 && professorRes.body && professorRes.body.professorId === profDbId) {
      addResult('Get Student Professor (GET /api/enrollment/professor)', true);
    } else {
      addResult('Get Student Professor (GET /api/enrollment/professor)', false, `Status: ${professorRes.status}, Body: ${JSON.stringify(professorRes.body)}`);
    }

    // ----------------------------------------------------
    // 7. WORKOUTS FLOW
    // ----------------------------------------------------
    console.log('\nTesting: Professor creating a weekly plan for the student...');
    const createPlanRes = await request
      .post('/api/workouts/plans')
      .set('Authorization', `Bearer ${profToken}`)
      .send({
        studentId: studDbId,
        name: 'Plano de Treino E2E',
        days: [
          {
            dayOfWeek: 'MONDAY',
            name: 'Treino de Peito/Triceps',
            exercises: [
              { name: 'Supino Reto', sets: 4, reps: 10, loadKg: 60, restSeconds: 60, notes: 'Focar na cadência', order: 0 },
              { name: 'Tríceps Pulley', sets: 3, reps: 12, loadKg: 25, restSeconds: 45, order: 1 }
            ]
          },
          {
            dayOfWeek: 'TUESDAY',
            name: 'Treino de Pernas',
            exercises: [
              { name: 'Agachamento Livre', sets: 4, reps: 10, loadKg: 80, restSeconds: 90, notes: 'Cuidado com a postura', order: 0 }
            ]
          }
        ]
      });

    if (createPlanRes.status === 200 && createPlanRes.body.id) {
      weeklyPlanId = createPlanRes.body.id;
      // Get a dayPlanId for completions
      dayPlanId = createPlanRes.body.days[0].id;
      addResult('Create Workout Plan (POST /api/workouts/plans)', true, `Plan ID: ${weeklyPlanId}`);
    } else {
      addResult('Create Workout Plan (POST /api/workouts/plans)', false, `Status: ${createPlanRes.status}, Body: ${JSON.stringify(createPlanRes.body)}`);
    }

    console.log('\nTesting: Student retrieving today\'s workout...');
    const todayRes = await request
      .get('/api/workouts/today')
      .set('Authorization', `Bearer ${studToken}`);

    if (todayRes.status === 200) {
      addResult('Get Today Workout (GET /api/workouts/today)', true);
    } else {
      addResult('Get Today Workout (GET /api/workouts/today)', false, `Status: ${todayRes.status}, Body: ${JSON.stringify(todayRes.body)}`);
    }

    console.log('\nTesting: Student marking workout day as completed...');
    if (dayPlanId) {
      const completeRes = await request
        .post('/api/workouts/complete')
        .set('Authorization', `Bearer ${studToken}`)
        .send({
          dayPlanId,
          date: new Date().toISOString()
        });

      if (completeRes.status === 200 && completeRes.body.id) {
        addResult('Complete Workout (POST /api/workouts/complete)', true);
      } else {
        addResult('Complete Workout (POST /api/workouts/complete)', false, `Status: ${completeRes.status}, Body: ${JSON.stringify(completeRes.body)}`);
      }
    } else {
      addResult('Complete Workout (POST /api/workouts/complete)', false, 'Skipped: dayPlanId not available');
    }

    // ----------------------------------------------------
    // 8. NUTRITION FLOW
    // ----------------------------------------------------
    const todayDateStr = new Date().toISOString().split('T')[0];

    console.log('\nTesting: Student logging a meal...');
    const createMealRes = await request
      .post('/api/nutrition/meals')
      .set('Authorization', `Bearer ${studToken}`)
      .send({
        type: 'LUNCH',
        date: new Date().toISOString(),
        items: [
          { name: 'Arroz Integral', quantity: 150, unit: 'g', calories: 180, protein: 4, carbs: 38, fat: 1 },
          { name: 'Peito de Frango Grelhado', quantity: 120, unit: 'g', calories: 198, protein: 37, carbs: 0, fat: 4.5 }
        ]
      });

    if (createMealRes.status === 200 && createMealRes.body.id) {
      addResult('Log Meal (POST /api/nutrition/meals)', true);
    } else {
      addResult('Log Meal (POST /api/nutrition/meals)', false, `Status: ${createMealRes.status}, Body: ${JSON.stringify(createMealRes.body)}`);
    }

    console.log('\nTesting: Student retrieving meals for today...');
    const getMealsRes = await request
      .get(`/api/nutrition/meals?date=${todayDateStr}`)
      .set('Authorization', `Bearer ${studToken}`);

    if (getMealsRes.status === 200 && getMealsRes.body.length > 0) {
      addResult('Get Meals (GET /api/nutrition/meals)', true);
    } else {
      addResult('Get Meals (GET /api/nutrition/meals)', false, `Status: ${getMealsRes.status}, Body: ${JSON.stringify(getMealsRes.body)}`);
    }

    console.log('\nTesting: Student searching for a food item (Open Food Facts integration)...');
    const searchRes = await request
      .get('/api/nutrition/search?q=banana')
      .set('Authorization', `Bearer ${studToken}`);

    if (searchRes.status === 200 && Array.isArray(searchRes.body)) {
      addResult('Search Food (GET /api/nutrition/search)', true, `Found ${searchRes.body.length} items`);
    } else {
      addResult('Search Food (GET /api/nutrition/search)', false, `Status: ${searchRes.status}, Body: ${JSON.stringify(searchRes.body)}`);
    }

    // ----------------------------------------------------
    // 9. SETTINGS FLOW
    // ----------------------------------------------------
    console.log('\nTesting: Student saving Expo push notification token...');
    const pushTokenRes = await request
      .post('/api/settings/push-token')
      .set('Authorization', `Bearer ${studToken}`)
      .send({
        token: 'ExponentPushToken[e2e-test-token-123456]'
      });

    if (pushTokenRes.status === 200 && pushTokenRes.body.success === true) {
      addResult('Save Push Token (POST /api/settings/push-token)', true);
    } else {
      addResult('Save Push Token (POST /api/settings/push-token)', false, `Status: ${pushTokenRes.status}, Body: ${JSON.stringify(pushTokenRes.body)}`);
    }

  } catch (err: any) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    // ----------------------------------------------------
    // 10. DATABASE CLEANUP
    // ----------------------------------------------------
    console.log('\n--- CLEANING UP DATABASE RECORDS ---');
    if (profDbId) {
      await cleanupUser(profDbId, professorEmail);
    }
    if (studDbId) {
      await cleanupUser(studDbId, studentEmail);
    }

    console.log('\n--- TEST SUMMARY ---');
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    console.log(`Passed: ${passed}/${total}`);

    // Exit successfully or with error code
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();
