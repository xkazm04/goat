# Testing Instructions - Simple Drag & Drop

## Quick Start

1. **Start the dev server:**
   ```bash
   cd goat
   npm run dev
   ```

2. **Open the test page:**
   ```
   http://localhost:3000/match-test
   ```

3. **You should see:**
   - Match Grid at the top (10 slots: Top 3 podium + positions 4-10)
   - Collection Panel at the bottom (groups + items)
   - 15 mock movie items with colored placeholder images

## Test Scenarios

### ✅ Test 1: Basic Drag and Drop
1. Click and hold on any item in the collection
2. Drag it to any grid slot
3. Release

**Expected:**
- Drag starts instantly (< 50ms)
- Item follows cursor smoothly
- Drop zone highlights when hovering
- Item appears in grid slot
- No lag or jank

### ✅ Test 2: Replace Item
1. Drag an item to an occupied slot
2. Release

**Expected:**
- New item replaces old item
- Old item disappears (not returned to collection yet)
- Smooth transition

### ✅ Test 3: Remove Item
1. Click "Remove" button on any occupied slot

**Expected:**
- Item disappears from grid
- Slot becomes empty
- Instant response

### ✅ Test 4: Group Filtering
1. Click on group names in left sidebar
2. Try "Select All" and "Clear" buttons

**Expected:**
- Items appear/disappear based on selection
- Instant response
- No layout shift

### ✅ Test 5: Multiple Drags
1. Drag 5-10 items quickly in succession
2. Fill all 10 slots

**Expected:**
- Each drag feels instant
- No accumulated lag
- Consistent performance

### ✅ Test 6: Drag Outside
1. Drag an item outside the grid area
2. Release

**Expected:**
- Item returns to collection
- No error
- Smooth animation

## Performance Checks

### Frame Rate Test
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform 5 drag operations
5. Stop recording

**Expected:**
- Green bars (60 FPS)
- No red/yellow warnings
- No long tasks (> 50ms)

### Memory Test
1. Open Chrome DevTools
2. Go to Memory tab
3. Take heap snapshot
4. Perform 20 drag operations
5. Take another snapshot
6. Compare

**Expected:**
- No significant memory increase
- No memory leaks
- Stable memory usage

### Network Test
1. Open DevTools Network tab
2. Perform drag operations

**Expected:**
- No network requests during drag
- Only initial image loads
- No unnecessary fetches

## Browser Testing

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile (if available)
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Touch should work smoothly

## Visual Checks

### Grid Slots
- [ ] Position numbers visible (#1, #2, etc.)
- [ ] Border highlights on hover
- [ ] "Drop here" text visible when empty
- [ ] Remove button appears when occupied

### Collection Items
- [ ] Images load correctly
- [ ] Titles visible at bottom
- [ ] Hover effect works
- [ ] Cursor changes to grab/grabbing

### Drag Overlay
- [ ] Shows item image during drag
- [ ] Follows cursor smoothly
- [ ] Slightly transparent (opacity-90)
- [ ] No flickering

## Common Issues & Solutions

### Issue: Drag doesn't start
**Solution:**
- Check console for errors
- Verify @dnd-kit/core is installed
- Try refreshing the page

### Issue: Drag feels laggy
**Solution:**
- Close other browser tabs
- Check CPU usage
- Disable browser extensions
- Check DevTools Performance tab

### Issue: Drop doesn't work
**Solution:**
- Verify drop zone is highlighted on hover
- Check console for errors
- Try dragging slower
- Verify collision detection

### Issue: Images don't load
**Solution:**
- Check internet connection
- Placeholder URLs should work offline
- Check browser console for 404s

## Success Criteria

The implementation is successful if:

1. ✅ **Instant Response**: Drag starts in < 50ms
2. ✅ **Smooth Performance**: 60 FPS throughout
3. ✅ **Precise Drops**: 100% accuracy, no missed drops
4. ✅ **No Lag**: Consistent performance after multiple drags
5. ✅ **No Errors**: Clean console, no warnings
6. ✅ **Works on Mobile**: Touch drag works smoothly
7. ✅ **Simple Code**: Easy to understand and modify

## Next Steps After Testing

### If ALL tests pass ✅
1. Document any observations
2. Proceed to Phase 2: Real data integration
3. Plan migration from old implementation

### If ANY test fails ❌
1. Document the failure
2. Check browser console for errors
3. Review the specific component
4. Fix before adding complexity

## Reporting Results

Please report:
1. **Browser & OS**: e.g., "Chrome 120 on Windows 11"
2. **Test Results**: Pass/Fail for each scenario
3. **Performance**: Frame rate, lag observations
4. **Issues**: Any bugs or unexpected behavior
5. **Suggestions**: Ideas for improvement

## Example Report

```
Browser: Chrome 120, Windows 11
Date: 2024-01-15

Test Results:
✅ Test 1: Basic Drag - PASS (instant, smooth)
✅ Test 2: Replace Item - PASS (works perfectly)
✅ Test 3: Remove Item - PASS (instant)
✅ Test 4: Group Filtering - PASS (no issues)
✅ Test 5: Multiple Drags - PASS (consistent)
✅ Test 6: Drag Outside - PASS (returns smoothly)

Performance:
- Frame Rate: 60 FPS (stable)
- Drag Start: ~30ms (excellent)
- Memory: Stable, no leaks

Issues: None

Suggestions:
- Add keyboard shortcuts
- Add undo/redo
- Add drag preview scaling

Overall: EXCELLENT - Ready for Phase 2
```

## Questions?

- Does it feel instant?
- Is it smooth?
- Is it precise?
- Is it simple?

If YES to all → **SUCCESS!** 🎉
If NO to any → Debug and fix before proceeding.
