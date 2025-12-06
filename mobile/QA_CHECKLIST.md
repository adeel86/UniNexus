# UniNexus Mobile App - QA Checklist

## Pre-Testing Requirements

- [ ] Backend API is running and accessible
- [ ] Test account credentials available
- [ ] Physical device for push notification testing
- [ ] Network conditions: WiFi and cellular available for offline testing

---

## Authentication

### Login
- [ ] Email/password login works correctly
- [ ] Invalid credentials show appropriate error
- [ ] "Remember me" persists session
- [ ] Login redirects to main app

### Sign Up
- [ ] New account creation works
- [ ] Form validation displays errors
- [ ] Duplicate email shows error
- [ ] Successful signup logs user in

### Logout
- [ ] Logout clears session
- [ ] Redirects to login screen
- [ ] Cached data is cleared

---

## Feed Screen

- [ ] Posts load and display correctly
- [ ] Pull-to-refresh works
- [ ] Infinite scroll loads more posts
- [ ] Like/unlike functionality works
- [ ] Comment count displays correctly
- [ ] Tapping post opens detail view
- [ ] User avatars display properly

---

## Post Detail

- [ ] Full post content displays
- [ ] Comments load and display
- [ ] Add new comment works
- [ ] Like post from detail view works
- [ ] Share functionality works
- [ ] Navigate back works correctly

---

## Messaging

### Conversations List
- [ ] Conversations load correctly
- [ ] Unread indicator shows
- [ ] Last message preview displays
- [ ] Tapping opens chat

### Chat Screen
- [ ] Messages load correctly
- [ ] Send message works
- [ ] Messages appear in real-time feel
- [ ] Scroll to load older messages
- [ ] Timestamps display correctly

---

## Courses

- [ ] Course list displays
- [ ] Course details open correctly
- [ ] Course progress displays
- [ ] Ask Teacher AI opens correctly
- [ ] AI responses work (if configured)

---

## Groups

- [ ] Groups list displays
- [ ] Group details load
- [ ] Member list shows
- [ ] Group posts display

---

## Challenges

- [ ] Active challenges display
- [ ] Challenge details open
- [ ] Progress tracking works
- [ ] Completed challenges show

---

## Profile

### View Profile
- [ ] Profile information displays
- [ ] Avatar shows correctly
- [ ] Stats/badges display
- [ ] Skills/endorsements show

### Edit Profile
- [ ] Edit form loads with current data
- [ ] Save changes works
- [ ] Photo upload works
- [ ] Validation errors display

### Settings
- [ ] Settings screen opens
- [ ] Theme toggle works (if applicable)
- [ ] Notification settings accessible
- [ ] Account settings work

---

## CV Export

- [ ] CV generation works
- [ ] Preview displays correctly
- [ ] Export/share functionality works
- [ ] PDF generates properly

---

## Push Notifications

- [ ] Permission prompt appears on first launch
- [ ] Token registers with backend
- [ ] Receive notification when app backgrounded
- [ ] Tapping notification opens correct screen
- [ ] Badge count updates

---

## Offline Functionality

### Offline Mode
- [ ] Offline banner appears when disconnected
- [ ] Cached data displays when offline
- [ ] Draft posts save locally
- [ ] Pending actions queue

### Reconnection
- [ ] Online banner shows pending actions
- [ ] Sync button works
- [ ] Queued actions submit
- [ ] Data refreshes on reconnect

---

## Performance

- [ ] App launches within 3 seconds
- [ ] Scrolling is smooth (60fps)
- [ ] Images load efficiently
- [ ] No memory leaks on navigation
- [ ] Battery usage is reasonable

---

## UI/UX

- [ ] All text is readable
- [ ] Touch targets are adequate size
- [ ] Loading states display
- [ ] Error states display
- [ ] Empty states display
- [ ] Safe area insets respected

---

## Device Compatibility

### Android
- [ ] Works on Android 10+
- [ ] Various screen sizes
- [ ] Back button behavior correct
- [ ] Status bar appearance correct

### iOS
- [ ] Works on iOS 14+
- [ ] Various iPhone sizes
- [ ] Safe area handled
- [ ] Swipe back gesture works

---

## Known Limitations

1. Push notifications require physical device
2. Some features may require backend API support
3. Offline mode caches limited data
4. Image upload requires camera/gallery permissions

---

## Sign-Off

| Tester Name | Date | Build Version | Status |
|-------------|------|---------------|--------|
|             |      |               |        |

**Notes:**
