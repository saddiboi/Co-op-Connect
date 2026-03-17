# CPS-406 Group Project - Fix Sub-screens Not Loading

## Current Issue
Some role-prefixed sub-pages fail to load.

## Task Status: Planning Complete - Ready for Implementation

### Approved Plan (Updated)
- Debug & validate role in navigation.js
- Add login check
- Test loads
  - This uses login/register stored role, keeps role-specific sub-pages loading correctly
  - No role-manager.js changes or HTML edits needed
- **Why**: navigation.js lacks getCurrentRole definition; localStorage has the role from Firebase user.role
- **Result**: Sub-screens load without errors, different UI per role preserved

### Implementation Steps:
- [x] Step 1: Update navigation.js with role validation & logs
- [x] Step 2: Update dashboard JS files (coordinator.js, student.js, partner.js)
- [x] Step 3: Test with npx live-server src/pages/coordinator-dashboard.html (running on port 8080)
- [ ] Step 4: Check console F12, verify loads
- [ ] Step 5: attempt_completion

### Testing:
```
# From project root
npx live-server src/pages/student-dashboard.html
# Click nav items, check role-student-*.html loads
# Repeat for coordinator-dashboard.html (coordinator-*.html)
```

Progress: Planning ✅ | Edits ⏳ | Testing ⏳ | Complete ⏳

