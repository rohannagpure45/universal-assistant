# monke.md

This is a new document called monke.md.

## Issues That Must Be Fixed Simultaneously (Grouped Dependencies)

**Group A - Type System Foundation**
- Issue #1 (VoiceSample type mismatch)
- Issue #11 (Store type definitions)
- Issue #16 (Meeting store type mismatches)

**Group B - React Context Issues**
- Issue #9 (React hooks in non-React code)
- Issue #5 (useLoadingState hook signature)

**Group C - Security Module Chain**
- Issue #7 (Type safety violations in security)
- Issue #8 (Missing security module exports)

## Fixing Order (Least to Most Disruptive)

### Phase 1: Foundation Dependencies (Fix First)
1. **Issue #6** - Add `@types/lodash-es` dependency
   - Zero disruption, enables other fixes
   
2. **Issue #3** - Missing Lucide icon exports
   - Simple icon replacement, no logic changes

### Phase 2: Type System Core (Fix Together)
3. **Group A** - All type definition issues (#1, #11, #16)
   - Must be fixed simultaneously to maintain consistency
   - Creates foundation for other fixes

### Phase 3: Service Layer Isolation
4. **Issue #9** - Remove React hooks from OptimizedRealtimeManager
   - Isolated fix, won't affect other services
   
5. **Issue #5** - Fix useLoadingState hook signature
   - After #9 to avoid conflicts

6. **Issue #10** - Fix MeetingServiceIntegration methods
   - Depends on type fixes from Phase 2

### Phase 4: Error Handling Layer
7. **Issue #4** - Fix unknown type assignments in VoiceRecording
   - Requires proper error types from earlier fixes
   
8. **Issue #22** - Add error boundaries 
   - Best added after core type issues resolved

9. **Issue #23** - Firebase error handling
   - Builds on error boundary infrastructure

### Phase 5: Authentication & Security
10. **Group C** - Security module issues (#7, #8)
    - Fix together to maintain module integrity

11. **Issue #14** - AuthService admin claims race condition
    - After security module fixes

12. **Issue #15** - Firebase token refresh logic
    - Depends on auth service fixes

13. **Issue #27** - Admin claims validation
    - After core auth fixes

### Phase 6: Service Integration
14. **Issue #2** - Voice identification enum mismatch
    - After type system stabilized

15. **Issue #12** - AIService model mappings
    - Isolated configuration fix

16. **Issue #13** - EnhancedAIService rate limiting
    - After AIService configuration

### Phase 7: Performance & Memory
17. **Issue #18** - UniversalAssistantCoordinator cleanup
    - Major refactor, do after core fixes

18. **Issue #19** - Audio Manager concurrency
    - Depends on coordinator fixes

19. **Issue #24** - Dashboard re-render optimization
    - After state management stabilized

20. **Issue #25** - Polling cleanup
    - After realtime service fixes

### Phase 8: Architecture Refactoring
21. **Issue #20** - Circular dependencies
    - Major architectural change, high risk

22. **Issue #21** - Singleton pattern violations
    - Requires service layer redesign

23. **Issue #17** - Real-time synchronization
    - After singleton issues resolved

### Phase 9: Security Hardening
24. **Issue #26** - Token validation in API routes
    - After auth system stabilized

25. **Issue #28** - Client-side secret storage
    - Configuration refactor

26. **Issue #32** - TTS route validation
    - After API structure finalized

27. **Issue #33** - AI response injection protection
    - After AI service fixes

### Phase 10: Database & Storage
28. **Issue #29** - Inefficient Firebase queries
    - After data model stabilized

29. **Issue #30** - Transaction failures
    - After query optimization

30. **Issue #31** - File upload race conditions
    - Storage layer refactor

### Phase 11: Browser Compatibility
31. **Issue #34** - Audio context management
    - After audio services fixed

32. **Issue #35** - MediaRecorder compatibility
    - Last, as it's browser-specific

## Critical Path Summary

**Must Fix First (Blocks Everything):**
- Add missing dependencies (#6)
- Fix type definitions (#1, #11, #16)

**High Priority (Blocks Many):**
- Remove React hooks from services (#9)
- Fix hook signatures (#5)
- Fix security modules (#7, #8)

**Medium Priority (Some Dependencies):**
- Error handling improvements (#4, #22, #23)
- Authentication fixes (#14, #15, #27)
- Service integration (#2, #10, #12, #13)

**Lower Priority (Fewer Dependencies):**
- Performance optimizations (#18, #19, #24, #25)
- Architecture refactoring (#20, #21, #17)
- Security hardening (#26, #28, #32, #33)
- Database/storage (#29, #30, #31)
- Browser compatibility (#34, #35)

