/**
 * Dashboard Test Configuration
 * 
 * Configuration for dashboard modification tests including:
 * - Test data fixtures
 * - Mock configurations
 * - Test environment setup
 * - Assertion helpers
 */

import { Page } from '@playwright/test';

export interface DashboardTestConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  viewport: {
    desktop: { width: number; height: number };
    tablet: { width: number; height: number };
    mobile: { width: number; height: number };
  };
}

export const dashboardTestConfig: DashboardTestConfig = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  retries: 2,
  viewport: {
    desktop: { width: 1440, height: 900 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  }
};

/**
 * Mock data for dashboard tests
 */
export const mockDashboardData = {
  // Real Firebase-like data (no mock percentages)
  statistics: {
    totalMeetings: 15,
    activeMeetings: 2,
    totalHours: 45.5,
    uniqueParticipants: 12
  },
  
  // Empty state data
  emptyStatistics: {
    totalMeetings: 0,
    activeMeetings: 0,
    totalHours: 0,
    uniqueParticipants: 0
  },

  // Sample meeting data
  recentMeetings: [
    {
      id: 'meeting-1',
      title: 'Weekly Team Standup',
      type: 'standup',
      status: 'completed',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      duration: 1800, // 30 minutes
      participantCount: 5
    },
    {
      id: 'meeting-2', 
      title: 'Project Planning Session',
      type: 'planning',
      status: 'completed',
      createdAt: new Date('2024-01-14T14:30:00Z'),
      duration: 3600, // 1 hour
      participantCount: 8
    },
    {
      id: 'meeting-3',
      title: 'Client Presentation',
      type: 'presentation',
      status: 'completed',
      createdAt: new Date('2024-01-12T09:00:00Z'),
      duration: 2700, // 45 minutes
      participantCount: 3
    }
  ],

  // User context
  user: {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    preferences: {
      theme: 'light',
      notifications: true
    }
  }
};

/**
 * Test selectors for dashboard elements
 */
export const dashboardSelectors = {
  // Main page elements
  heading: '[data-testid="dashboard-heading"], h1:has-text("Dashboard")',
  greetingText: '[data-testid="greeting-text"]',
  
  // Statistics cards
  statsGrid: '[data-testid="stats-grid"], .grid:has([data-testid*="stat-card"])',
  totalMeetingsCard: '[data-testid="total-meetings-card"], :text("Total Meetings")',
  activeMeetingsCard: '[data-testid="active-meetings-card"], :text("Active Meetings")',
  totalHoursCard: '[data-testid="total-hours-card"], :text("Total Hours")',
  participantsCard: '[data-testid="participants-card"], :text("Participants")',
  
  // Quick Actions
  quickActionsSection: '[data-testid="quick-actions"], h3:has-text("Quick Actions")',
  startMeetingButton: '[data-testid="start-meeting-btn"], button:has-text("Start New Meeting")',
  
  // Recent Meetings
  recentMeetingsSection: '[data-testid="recent-meetings"], h3:has-text("Recent Meetings")',
  meetingCard: '[data-testid*="meeting-card"]',
  emptyMeetingsMessage: '[data-testid="empty-meetings"], :text("No Recent Meetings")',
  
  // Loading and error states
  loadingSpinner: '[data-testid="loading-spinner"], .animate-spin',
  errorDisplay: '[data-testid="error-display"], :text("Dashboard Error")',
  retryButton: '[data-testid="retry-btn"], button:has-text("Retry")',
  
  // Elements that should NOT exist after modifications
  removedElements: {
    scheduleMeetingButton: 'button:has-text("Schedule Meeting")',
    todaysScheduleSection: 'h3:has-text("Today\'s Schedule")',
    scheduleCalendar: '[data-testid="schedule-calendar"]',
    upcomingMeetings: ':text("Upcoming Today")'
  }
};

/**
 * Test utilities for dashboard testing
 */
export class DashboardTestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for dashboard to fully load
   */
  async waitForDashboardLoad(timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(dashboardSelectors.heading, { 
      state: 'visible',
      timeout 
    });
    
    // Wait for potential loading states to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify no scheduling elements exist
   */
  async verifySchedulingElementsRemoved(): Promise<boolean> {
    const removedSelectors = Object.values(dashboardSelectors.removedElements);
    
    for (const selector of removedSelectors) {
      const element = await this.page.locator(selector).count();
      if (element > 0) {
        console.warn(`Found scheduling element that should be removed: ${selector}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get statistics values from the dashboard
   */
  async getStatisticsValues(): Promise<{
    totalMeetings: string;
    activeMeetings: string; 
    totalHours: string;
    participants: string;
  }> {
    await this.waitForDashboardLoad();
    
    const totalMeetings = await this.page
      .locator(dashboardSelectors.totalMeetingsCard)
      .locator('..')
      .locator(':text-matches("^\\d+$")')
      .textContent() || '0';
      
    const activeMeetings = await this.page
      .locator(dashboardSelectors.activeMeetingsCard)
      .locator('..')
      .locator(':text-matches("^\\d+$")')
      .textContent() || '0';
      
    const totalHours = await this.page
      .locator(dashboardSelectors.totalHoursCard)
      .locator('..')
      .locator(':text-matches("^\\d+\\.?\\d*h$")')
      .textContent() || '0h';
      
    const participants = await this.page
      .locator(dashboardSelectors.participantsCard)
      .locator('..')
      .locator(':text-matches("^\\d+$")')
      .textContent() || '0';

    return {
      totalMeetings,
      activeMeetings,
      totalHours,
      participants
    };
  }

  /**
   * Check if data appears to be real (not mock percentages)
   */
  async verifyRealData(): Promise<boolean> {
    const stats = await this.getStatisticsValues();
    
    // Check that no values contain percentages
    const hasPercentages = Object.values(stats).some(value => value.includes('%'));
    
    // Check that values are numeric (with optional units)
    const numericPattern = /^\d+(\.\d+)?[a-z]*$/i;
    const allNumeric = Object.values(stats).every(value => numericPattern.test(value));
    
    return !hasPercentages && allNumeric;
  }

  /**
   * Simulate different viewport sizes
   */
  async testResponsiveLayout(viewportType: 'desktop' | 'tablet' | 'mobile'): Promise<void> {
    const viewport = dashboardTestConfig.viewport[viewportType];
    await this.page.setViewportSize(viewport);
    await this.page.reload();
    await this.waitForDashboardLoad();
  }

  /**
   * Monitor console errors during test
   */
  async monitorConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    return errors;
  }

  /**
   * Check page performance metrics
   */
  async measurePageLoad(): Promise<{ loadTime: number; domContentLoaded: number }> {
    const startTime = Date.now();
    
    await this.page.goto('/dashboard');
    await this.waitForDashboardLoad();
    
    const loadTime = Date.now() - startTime;
    
    const domContentLoaded = await this.page.evaluate(() => {
      return performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    });
    
    return { loadTime, domContentLoaded };
  }

  /**
   * Verify accessibility attributes
   */
  async checkAccessibility(): Promise<{
    hasHeadingHierarchy: boolean;
    hasAriaLabels: boolean;
    keyboardNavigable: boolean;
  }> {
    await this.waitForDashboardLoad();
    
    // Check heading hierarchy
    const h1Count = await this.page.locator('h1').count();
    const hasHeadingHierarchy = h1Count === 1;
    
    // Check ARIA labels on interactive elements
    const interactiveElements = await this.page.locator('button, a[role="button"]').count();
    const elementsWithAriaLabel = await this.page.locator('button[aria-label], a[aria-label]').count();
    const hasAriaLabels = elementsWithAriaLabel >= interactiveElements;
    
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
    const keyboardNavigable = focusedElement === 'BUTTON' || focusedElement === 'A';
    
    return {
      hasHeadingHierarchy,
      hasAriaLabels,
      keyboardNavigable
    };
  }
}

/**
 * Common test assertions
 */
export const dashboardAssertions = {
  /**
   * Assert that scheduling features are removed
   */
  async schedulingFeaturesRemoved(page: Page): Promise<void> {
    const utils = new DashboardTestUtils(page);
    const removed = await utils.verifySchedulingElementsRemoved();
    
    if (!removed) {
      throw new Error('Scheduling features were not properly removed from dashboard');
    }
  },

  /**
   * Assert that statistics show real data
   */
  async statisticsShowRealData(page: Page): Promise<void> {
    const utils = new DashboardTestUtils(page);
    const isReal = await utils.verifyRealData();
    
    if (!isReal) {
      throw new Error('Dashboard statistics appear to show mock data instead of real Firebase data');
    }
  },

  /**
   * Assert performance is acceptable
   */
  async performanceIsAcceptable(page: Page, maxLoadTime: number = 5000): Promise<void> {
    const utils = new DashboardTestUtils(page);
    const { loadTime } = await utils.measurePageLoad();
    
    if (loadTime > maxLoadTime) {
      throw new Error(`Dashboard load time (${loadTime}ms) exceeds maximum (${maxLoadTime}ms)`);
    }
  }
};

/**
 * Test data generators
 */
export const testDataGenerators = {
  /**
   * Generate realistic dashboard statistics
   */
  generateDashboardStats(options: { empty?: boolean; highActivity?: boolean } = {}) {
    if (options.empty) {
      return mockDashboardData.emptyStatistics;
    }
    
    if (options.highActivity) {
      return {
        totalMeetings: Math.floor(Math.random() * 100) + 50,
        activeMeetings: Math.floor(Math.random() * 10) + 5,
        totalHours: Math.floor(Math.random() * 500) + 100,
        uniqueParticipants: Math.floor(Math.random() * 50) + 20
      };
    }
    
    return mockDashboardData.statistics;
  },

  /**
   * Generate meeting history data
   */
  generateMeetingHistory(count: number = 3) {
    const meetingTypes = ['standup', 'planning', 'presentation', 'brainstorming', 'review'];
    const statuses = ['completed', 'cancelled'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `meeting-${i + 1}`,
      title: `Meeting ${i + 1}`,
      type: meetingTypes[Math.floor(Math.random() * meetingTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
      duration: Math.floor(Math.random() * 3600) + 900, // 15 min to 1 hour
      participantCount: Math.floor(Math.random() * 10) + 1
    }));
  }
};

export default dashboardTestConfig;