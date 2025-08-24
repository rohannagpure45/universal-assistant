/**
 * Focus management utilities for accessibility
 * Provides focus trapping, restoration, and keyboard navigation helpers
 */

import { RefObject } from 'react';

// Focusable element selectors
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'iframe',
  'object',
  'embed',
  'area[href]',
  'summary',
].join(',');

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS))
    .filter((element) => {
      return (
        element instanceof HTMLElement &&
        !element.hasAttribute('disabled') &&
        !element.getAttribute('aria-hidden') &&
        element.tabIndex !== -1 &&
        isElementVisible(element)
      );
    }) as HTMLElement[];
}

/**
 * Check if an element is visible (not hidden by CSS)
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Focus trap class for modal dialogs and dropdowns
 */
export class FocusTrap {
  private container: HTMLElement;
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private isActive = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.previousFocus = document.activeElement as HTMLElement;
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    if (this.isActive) return;
    
    this.updateFocusableElements();
    this.isActive = true;
    
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('focusin', this.handleFocusIn);
    
    // Focus the first focusable element or the container itself
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    } else {
      this.container.focus();
    }
  }

  /**
   * Deactivate the focus trap and restore previous focus
   */
  deactivate(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('focusin', this.handleFocusIn);
    
    // Restore focus to the element that was focused before the trap
    if (this.previousFocus && document.contains(this.previousFocus)) {
      this.previousFocus.focus();
    }
  }

  /**
   * Update the list of focusable elements
   */
  private updateFocusableElements(): void {
    const focusableElements = getFocusableElements(this.container);
    this.firstFocusable = focusableElements[0] || null;
    this.lastFocusable = focusableElements[focusableElements.length - 1] || null;
  }

  /**
   * Handle keydown events for focus trapping
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isActive) return;

    // Handle Tab key
    if (event.key === 'Tab') {
      // If no focusable elements, prevent tabbing
      if (!this.firstFocusable) {
        event.preventDefault();
        return;
      }

      // Shift+Tab from first element -> focus last element
      if (event.shiftKey && document.activeElement === this.firstFocusable) {
        event.preventDefault();
        this.lastFocusable?.focus();
        return;
      }

      // Tab from last element -> focus first element
      if (!event.shiftKey && document.activeElement === this.lastFocusable) {
        event.preventDefault();
        this.firstFocusable?.focus();
        return;
      }
    }

    // Handle Escape key
    if (event.key === 'Escape') {
      event.preventDefault();
      this.deactivate();
      
      // Dispatch custom event for components to handle
      this.container.dispatchEvent(new CustomEvent('focus-trap-escape', {
        bubbles: true,
        detail: { trap: this }
      }));
    }
  };

  /**
   * Handle focus events to ensure focus stays within the container
   */
  private handleFocusIn = (event: FocusEvent): void => {
    if (!this.isActive) return;

    const target = event.target as HTMLElement;
    
    // If focus moves outside the container, redirect it back
    if (!this.container.contains(target)) {
      event.preventDefault();
      if (this.firstFocusable) {
        this.firstFocusable.focus();
      } else {
        this.container.focus();
      }
    }
  };
}

/**
 * Hook-like function to create and manage a focus trap
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean) {
  let focusTrap: FocusTrap | null = null;

  const activate = () => {
    if (containerRef.current && !focusTrap) {
      focusTrap = new FocusTrap(containerRef.current);
      focusTrap.activate();
    }
  };

  const deactivate = () => {
    if (focusTrap) {
      focusTrap.deactivate();
      focusTrap = null;
    }
  };

  // Auto-manage based on isActive prop
  if (isActive && !focusTrap && containerRef.current) {
    activate();
  } else if (!isActive && focusTrap) {
    deactivate();
  }

  return { activate, deactivate };
}

/**
 * Keyboard navigation helper for dropdown menus and lists
 */
export class KeyboardNavigator {
  private items: HTMLElement[] = [];
  private currentIndex = -1;
  private container: HTMLElement;
  private loop: boolean;

  constructor(container: HTMLElement, options: { loop?: boolean } = {}) {
    this.container = container;
    this.loop = options.loop ?? true;
    this.updateItems();
  }

  /**
   * Update the list of navigable items
   */
  updateItems(): void {
    this.items = getFocusableElements(this.container);
    
    // Find currently focused item
    const activeElement = document.activeElement;
    this.currentIndex = this.items.findIndex(item => item === activeElement);
  }

  /**
   * Navigate to the next item
   */
  next(): void {
    if (this.items.length === 0) return;

    this.currentIndex++;
    
    if (this.currentIndex >= this.items.length) {
      this.currentIndex = this.loop ? 0 : this.items.length - 1;
    }
    
    this.focusCurrentItem();
  }

  /**
   * Navigate to the previous item
   */
  previous(): void {
    if (this.items.length === 0) return;

    this.currentIndex--;
    
    if (this.currentIndex < 0) {
      this.currentIndex = this.loop ? this.items.length - 1 : 0;
    }
    
    this.focusCurrentItem();
  }

  /**
   * Navigate to the first item
   */
  first(): void {
    if (this.items.length === 0) return;
    this.currentIndex = 0;
    this.focusCurrentItem();
  }

  /**
   * Navigate to the last item
   */
  last(): void {
    if (this.items.length === 0) return;
    this.currentIndex = this.items.length - 1;
    this.focusCurrentItem();
  }

  /**
   * Focus the current item
   */
  private focusCurrentItem(): void {
    const item = this.items[this.currentIndex];
    if (item) {
      item.focus();
    }
  }

  /**
   * Handle keyboard events for navigation
   */
  handleKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.next();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.previous();
        break;
        
      case 'Home':
        event.preventDefault();
        this.first();
        break;
        
      case 'End':
        event.preventDefault();
        this.last();
        break;
        
      default:
        // Handle character navigation (typeahead)
        if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
          this.navigateByCharacter(event.key.toLowerCase());
        }
        break;
    }
  };

  /**
   * Navigate to item that starts with the given character
   */
  private navigateByCharacter(char: string): void {
    const startIndex = (this.currentIndex + 1) % this.items.length;
    
    for (let i = 0; i < this.items.length; i++) {
      const index = (startIndex + i) % this.items.length;
      const item = this.items[index];
      const text = item.textContent?.toLowerCase() || '';
      
      if (text.startsWith(char)) {
        this.currentIndex = index;
        this.focusCurrentItem();
        break;
      }
    }
  }
}

/**
 * Announce text to screen readers using a live region
 */
export function announceToScreenReader(
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-live';
  liveRegion.textContent = message;
  
  document.body.appendChild(liveRegion);
  
  // Remove the live region after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

/**
 * Generate a unique ID for accessibility attributes
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableElements = getFocusableElements(element.parentElement || document.body);
  return focusableElements.includes(element);
}

/**
 * Move focus to the next focusable element after the given element
 */
export function focusNext(currentElement: HTMLElement): void {
  const allFocusable = getFocusableElements(document.body);
  const currentIndex = allFocusable.indexOf(currentElement);
  
  if (currentIndex >= 0 && currentIndex < allFocusable.length - 1) {
    allFocusable[currentIndex + 1].focus();
  }
}

/**
 * Move focus to the previous focusable element before the given element
 */
export function focusPrevious(currentElement: HTMLElement): void {
  const allFocusable = getFocusableElements(document.body);
  const currentIndex = allFocusable.indexOf(currentElement);
  
  if (currentIndex > 0) {
    allFocusable[currentIndex - 1].focus();
  }
}