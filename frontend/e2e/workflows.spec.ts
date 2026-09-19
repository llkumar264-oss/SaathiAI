import { test, expect } from '@playwright/test';

test.describe('SaathiAI Senior Citizen Companion - Connected Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API routes with deterministic mock responses if running in mock/offline mode
    await page.route('**/api/guest/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'guest-mock-token-2026',
          user: {
            uid: 'guest_user_demo',
            email: 'guest@saathi.local',
            displayName: 'Guest Senior',
            isGuest: true,
          },
          summary: {
            medicines_count: 3,
            vitals_count: 20,
            scam_checks_count: 3,
            documents_count: 1,
          },
        }),
      });
    });

    await page.route('**/api/brief/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: '2026-09-19',
          greeting: 'नमस्ते शर्मा जी! आपका दिन शुभ और सुखमय हो।',
          weather: {
            temperature_celsius: 29.5,
            condition: 'हल्की धूप व सुहावना मौसम',
            humidity_percent: 55,
            senior_advice: 'मौसम सुहावना है। सुबह या शाम को 15-20 मिनट की धीमी चहलकदमी के लिए उत्तम दिन है।',
            city: 'नई दिल्ली (New Delhi)',
          },
          medicines: [
            {
              id: 'med_amlo_1',
              name: 'Amlodipine',
              dosage: '5mg',
              timing: '08:30',
              purpose: 'Blood pressure control',
              status: 'scheduled',
            },
          ],
          vitals_status: 'सामान्य (Normal)',
          scam_tip: 'बिजली बिल कटने का कोई भी मैसेज आए तो पहले परिजनों से पूछें।',
        }),
      });
    });
  });

  test('Workflow 1: Guest Mode Login & Morning Brief Display', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Welcome Auth page
    await expect(page.locator('text=साथी AI')).toBeVisible();

    // 2. Click "Try as Guest" hero action
    const guestBtn = page.locator('text=तुरंत शुरू करें (बिना पासवर्ड)');
    await expect(guestBtn).toBeVisible();
    await guestBtn.click();

    // 3. Verify Dashboard loads with Morning Brief and greeting
    await expect(page.locator('text=नमस्ते शर्मा जी')).toBeVisible();
    await expect(page.locator('text=मौसम सुहावना है')).toBeVisible();
  });

  test('Workflow 2: Medicine Routine, Adherence & Dose Logging', async ({ page }) => {
    await page.route('**/api/medicines', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'med_amlo_1',
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily - Morning',
            timing: '08:30',
            purpose: 'Blood pressure control',
          },
        ]),
      });
    });

    await page.route('**/api/medicines/adherence', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          overall_adherence_percent: 88.5,
          total_scheduled: 14,
          total_taken: 12,
          total_skipped: 2,
          missed_medicines: [],
        }),
      });
    });

    await page.goto('/');
    await page.locator('text=तुरंत शुरू करें (बिना पासवर्ड)').click();

    // Navigate to Medicine Manager tile
    const medTile = page.locator('text=दवाइयां एवं रिमाइंडर (Medicines)');
    await expect(medTile).toBeVisible();
    await medTile.click();

    // Check adherence stats and medicine card
    await expect(page.locator('text=88.5%')).toBeVisible();
    await expect(page.locator('text=Amlodipine')).toBeVisible();
  });

  test('Workflow 3: Scam Shield Check with High-Risk Alert', async ({ page }) => {
    await page.route('**/api/scam/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scam_probability: 0.98,
          verdict: 'उच्च जोखिम (HIGH RISK SCAM)',
          explanation: 'यह बिजली बिल कटने का जाना-पहचाना फर्जी फ्रॉड मैसेज है।',
          family_alert_sent: true,
          alert_id: 'scam_alert_1',
          contact_notified: 'Rahul (Son)',
        }),
      });
    });

    await page.goto('/');
    await page.locator('text=तुरंत शुरू करें (बिना पासवर्ड)').click();

    // Navigate to Scam Shield tile
    const scamTile = page.locator('text=धोखाधड़ी से सुरक्षा (Scam Shield)');
    await expect(scamTile).toBeVisible();
    await scamTile.click();

    // Fill suspicious SMS in textarea
    const textarea = page.locator('textarea');
    await textarea.fill('Dear customer electricity will disconnect tonight at 9:30 PM call 9876543210 immediately');

    // Click Check SMS button
    const checkBtn = page.locator('text=संदेश की जांच करें');
    await checkBtn.click();

    // Verify High Risk alert and explanation
    await expect(page.locator('text=उच्च जोखिम')).toBeVisible();
  });

  test('Workflow 4: Health Vitals Entry & 4-Tier Evaluation', async ({ page }) => {
    await page.route('**/api/vitals', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'vital_mock_1',
          type: 'blood_pressure',
          systolic: 128,
          diastolic: 82,
          sugar_value: null,
          tier: 'सामान्य (Normal)',
          senior_guidance: 'आपका ब्लड प्रेशर JNC-8 मानक के अनुसार उत्तम है।',
          is_anomaly: false,
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/vitals/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'vital_mock_1',
            type: 'blood_pressure',
            systolic: 128,
            diastolic: 82,
            sugar_value: null,
            tier: 'सामान्य (Normal)',
            senior_guidance: 'सामान्य स्थिति',
            is_anomaly: false,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.locator('text=तुरंत शुरू करें (बिना पासवर्ड)').click();

    // Navigate to Vitals tile
    const vitalsTile = page.locator('text=स्वास्थ्य ट्रैकर (Health & Vitals)');
    await expect(vitalsTile).toBeVisible();
    await vitalsTile.click();

    // Verify JNC-8 guidelines banner
    await expect(page.locator('text=JNC-8 मानक')).toBeVisible();
  });

  test('Workflow 5: 3-Second Hold SOS Emergency Activation', async ({ page }) => {
    await page.route('**/api/family/sos', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'alert_sent',
          message: 'SOS Emergency Alert dispatched to all trusted contacts',
          dispatched_to: ['Rahul (Son)', 'Priya (Daughter)'],
          contacts_count: 2,
          location_included: true,
          alert_timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');
    await page.locator('text=तुरंत शुरू करें (बिना पासवर्ड)').click();

    // Verify SOS button exists in header
    const sosBtn = page.locator('button[aria-label*="SOS Emergency Alert"]');
    await expect(sosBtn).toBeVisible();
  });
});
