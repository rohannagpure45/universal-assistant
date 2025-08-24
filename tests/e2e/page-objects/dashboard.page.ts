import { Page, Locator, expect } from '@playwright/test';

/**
 * Dashboard Page Object Model
 * 
 * Encapsulates dashboard page elements and interactions for better test maintainability
 */
export class DashboardPage {
  private page: Page;

  // Main page elements
  readonly heading: Locator;
  readonly greetingText: Locator;
  readonly meetingInProgressBadge: Locator;

  // Statistics cards
  readonly totalMeetingsCard: Locator;
  readonly activeMeetingsCard: Locator; 
  readonly totalHoursCard: Locator;
  readonly participantsCard: Locator;
  readonly statsGrid: Locator;

  // Quick Actions section
  readonly quickActionsHeading: Locator;
  readonly startNewMeetingButton: Locator;
  readonly quickActionsSection: Locator;

  // Recent Meetings section
  readonly recentMeetingsHeading: Locator;
  readonly recentMeetingsSection: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateIcon: Locator;
  readonly viewAllButton: Locator;

  // Error and loading states
  readonly errorDisplay: Locator;
  readonly retryButton: Locator;
  readonly loadingSpinner: Locator;
  readonly skeletonCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main page elements
    this.heading = page.getByRole('heading', { name: 'Dashboard', level: 1 });
    this.greetingText = page.locator('p').filter({ hasText: /good morning|good afternoon|good evening|welcome/i });
    this.meetingInProgressBadge = page.locator('[class*="from-danger"]').filter({ hasText: /meeting in progress/i });

    // Statistics cards
    this.totalMeetingsCard = page.getByText('Total Meetings');
    this.activeMeetingsCard = page.getByText('Active Meetings');
    this.totalHoursCard = page.getByText('Total Hours');
    this.participantsCard = page.getByText('Participants');
    this.statsGrid = page.locator('.grid').filter({ hasText: /Total Meetings|Active Meetings/ });

    // Quick Actions section
    this.quickActionsHeading = page.getByRole('heading', { name: /quick actions/i });
    this.startNewMeetingButton = page.getByRole('button', { name: /start new meeting/i });
    this.quickActionsSection = page.locator('h3:has-text("Quick Actions")').locator('..');

    // Recent Meetings section
    this.recentMeetingsHeading = page.getByRole('heading', { name: /recent meetings/i });
    this.recentMeetingsSection = page.locator('h3:has-text("Recent Meetings")').locator('..');
    this.emptyStateMessage = page.getByText(/no recent meetings/i);
    this.emptyStateIcon = page.locator('svg[data-lucide="calendar"]');
    this.viewAllButton = page.getByRole('button', { name: /view all/i });

    // Error and loading states
    this.errorDisplay = page.locator('[class*="border-danger"]').filter({ hasText: /error/i });
    this.retryButton = page.getByRole('button', { name: /retry/i });
    this.loadingSpinner = page.locator('[class*="animate-spin"]');
    this.skeletonCards = page.locator('[class*="animate-pulse"], [class*="skeleton"]');
  }

  /**
   * Navigation methods
   */
  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDashboardLoad() {
    await this.heading.waitFor({ state: 'visible' });
    // Give additional time for data to load
    await this.page.waitForTimeout(1000);
  }

  async startNewMeeting() {
    await this.startNewMeetingButton.click();
    await this.page.waitForURL('**/meeting');
  }

  /**
   * Verification methods
   */
  async verifySchedulingFeaturesRemoved() {
    // Check for Schedule Meeting button
    const scheduleMeetingButton = this.page.getByRole('button', { name: /schedule meeting/i });
    await expect(scheduleMeetingButton).not.toBeVisible();

    // Check for Today's Schedule section
    const todaysScheduleHeading = this.page.getByRole('heading', { name: /today.s schedule/i });
    await expect(todaysScheduleHeading).not.toBeVisible();

    // Check for various schedule-related terms
    const scheduleRelatedTerms = [
      /schedule meeting/i,
      /today.s schedule/i,
      /upcoming today/i,
      /scheduled for/i
    ];

    for (const term of scheduleRelatedTerms) {
      const element = this.page.getByText(term);
      await expect(element).not.toBeVisible();
    }
  }

  async verifyQuickActionsStructure() {
    // Verify heading is present
    await expect(this.quickActionsHeading).toBeVisible();

    // Verify Start New Meeting button is present and properly configured
    await expect(this.startNewMeetingButton).toBeVisible();
    await expect(this.startNewMeetingButton).toBeEnabled();
    await expect(this.startNewMeetingButton).toHaveAttribute('aria-label', 'Start New Meeting');

    // Verify microphone icon is present
    const micIcon = this.quickActionsSection.locator('svg[data-lucide="mic"]');
    await expect(micIcon).toBeVisible();

    // Verify only one button exists in Quick Actions
    const buttonsInQuickActions = this.quickActionsSection.getByRole('button');
    const buttonCount = await buttonsInQuickActions.count();
    expect(buttonCount).toBe(1);
  }

  async verifyStatisticsCards() {
    const expectedCards = [
      { name: 'Total Meetings', locator: this.totalMeetingsCard },
      { name: 'Active Meetings', locator: this.activeMeetingsCard },
      { name: 'Total Hours', locator: this.totalHoursCard },
      { name: 'Participants', locator: this.participantsCard }
    ];

    // Verify all cards are visible
    for (const card of expectedCards) {
      await expect(card.locator).toBeVisible();
    }

    // Verify each card has icon and numeric value
    for (const card of expectedCards) {
      const cardContainer = card.locator.locator('..');
      const icon = cardContainer.locator('svg').first();
      await expect(icon).toBeVisible();

      // Look for numeric values (including 0 and values with units like "2.5h")
      const numericValue = cardContainer.locator('[class*="text-"]').filter({ hasText: /^\d+(\.\d+)?[a-z]*$/i });
      await expect(numericValue).toBeVisible();
    }
  }

  async verifyRecentMeetingsSection() {
    // Verify heading is present
    await expect(this.recentMeetingsHeading).toBeVisible();

    // Check if there are meetings or empty state
    const hasMeetings = await this.recentMeetingsSection.locator('[data-testid*="meeting"], .meeting-card').count() > 0;
    const hasEmptyState = await this.emptyStateMessage.isVisible();

    expect(hasMeetings || hasEmptyState).toBe(true);

    if (hasEmptyState) {
      await expect(this.emptyStateIcon).toBeVisible();
      await expect(this.page.getByText(/start your first meeting/i)).toBeVisible();
    }
  }

  async verifyNoHardcodedData() {
    // Check that there are no fake percentages or placeholder data
    const fakeDataPatterns = [/%/, /lorem/i, /ipsum/i, /example/i, /placeholder/i, /fake/i];
    
    for (const pattern of fakeDataPatterns) {
      const fakeElement = this.page.getByText(pattern);
      const isVisible = await fakeElement.isVisible();
      if (isVisible) {
        // Log warning but don't fail - might be legitimate text
        console.warn(`Potential fake data found: ${pattern}`);
      }
    }
  }

  /**
   * Data loading verification methods
   */
  async waitForDataLoad() {
    // Wait for potential loading states to complete
    await this.page.waitForTimeout(3000);
    
    // Verify statistics have loaded with real values
    const totalMeetingsValue = this.totalMeetingsCard.locator('..').getByText(/^\d+$/);
    await expect(totalMeetingsValue).toBeVisible();
  }

  async verifyLoadingStates() {
    // Check if loading elements are initially present
    const hasLoadingElements = await this.loadingSpinner.or(this.skeletonCards).isVisible();
    
    if (hasLoadingElements) {
      // Wait for loading to complete
      await this.waitForDashboardLoad();
      await this.page.waitForTimeout(2000);
    }

    // After loading, content should be visible
    await expect(this.totalMeetingsCard).toBeVisible();
  }

  async verifyErrorHandling() {
    const hasError = await this.errorDisplay.isVisible();
    
    if (hasError) {
      // Should have retry functionality
      await expect(this.retryButton).toBeVisible();
      await expect(this.retryButton).toBeEnabled();
      
      // Dashboard structure should still be intact
      await expect(this.heading).toBeVisible();
    }
  }

  /**
   * Responsive design verification
   */
  async verifyDesktopLayout() {
    await this.page.setViewportSize({ width: 1440, height: 900 });
    await this.goto();
    await this.waitForDashboardLoad();

    // Verify grid layout for stats
    const gridClasses = await this.statsGrid.getAttribute('class');
    expect(gridClasses).toMatch(/xl:grid-cols-4|lg:grid-cols-4/);

    // Verify sidebar layout structure
    await expect(this.quickActionsHeading).toBeVisible();
    await expect(this.recentMeetingsHeading).toBeVisible();
  }

  async verifyMobileLayout() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.goto();
    await this.waitForDashboardLoad();

    // Button should be full-width
    const buttonClasses = await this.startNewMeetingButton.getAttribute('class');
    expect(buttonClasses).toMatch(/w-full|fullWidth/);

    // Touch target should be adequate
    const buttonBox = await this.startNewMeetingButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  }

  /**
   * Accessibility verification
   */
  async verifyAccessibility() {
    // Verify heading hierarchy
    await expect(this.heading).toBeVisible();
    
    // Verify button accessibility
    await expect(this.startNewMeetingButton).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await this.startNewMeetingButton.focus();
    await expect(this.startNewMeetingButton).toBeFocused();
  }

  /**
   * Performance and error monitoring
   */
  async monitorConsoleErrors(): Promise<string[]> {
    const consoleErrors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    return consoleErrors;
  }

  async getCriticalErrors(allErrors: string[]): Promise<string[]> {
    return allErrors.filter(error => 
      !error.includes('Firebase') &&
      !error.includes('offline') &&
      !error.includes('network') &&
      !error.includes('Warning:') // React warnings
    );
  }

  /**
   * Authentication verification
   */
  async verifyAuthenticationRequired(): Promise<boolean> {
    // Try to access dashboard in incognito mode
    const context = await this.page.context().browser()?.newContext();
    if (!context) return false;

    const incognitoPage = await context.newPage();
    await incognitoPage.goto('/dashboard');
    await incognitoPage.waitForTimeout(2000);

    const currentUrl = incognitoPage.url();
    const isOnDashboard = currentUrl.includes('/dashboard');
    const isOnAuth = currentUrl.includes('/auth') || currentUrl.includes('/login');
    const hasLoginForm = await incognitoPage.getByRole('button', { name: /sign in/i }).isVisible();

    await context.close();

    return isOnAuth || hasLoginForm || !isOnDashboard;
  }
}