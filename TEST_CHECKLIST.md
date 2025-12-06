# UniNexus Test Checklist

## Smoke Test Flows

Run through these flows to verify no regressions after changes.

### Authentication
- [ ] Login with demo student account (`demo.student@uninexus.app` / `demo123`)
- [ ] Login with demo teacher account
- [ ] Login with demo university admin account
- [ ] Login with demo industry professional account
- [ ] Login with demo master admin account
- [ ] Logout functionality works
- [ ] Registration form validates input

### Social Feed
- [ ] Feed loads posts on student home
- [ ] Create new post (text only)
- [ ] Create new post with image
- [ ] Like/react to a post
- [ ] Comment on a post
- [ ] View post comments
- [ ] Suggested posts widget loads

### User Profiles
- [ ] View own profile
- [ ] View other user's profile
- [ ] Edit profile information
- [ ] Add/edit skills
- [ ] Add/edit education
- [ ] View achievements and badges

### Courses
- [ ] View available courses list
- [ ] View course details
- [ ] Enroll in a course (student)
- [ ] Create new course (teacher)
- [ ] Upload course materials (teacher, validated course only)
- [ ] View course discussions
- [ ] Post in course discussion

### Messaging
- [ ] View conversations list
- [ ] Open existing conversation
- [ ] Send a new message
- [ ] Start new conversation with a user

### Groups
- [ ] View groups discovery page
- [ ] View group details
- [ ] Join a group
- [ ] Post in group (if member)
- [ ] Create new group

### Connections/Network
- [ ] View network page
- [ ] Follow another user
- [ ] Send connection request
- [ ] Accept connection request
- [ ] View followers/following lists

### AI Features
- [ ] Open CareerBot chat
- [ ] Send message to CareerBot
- [ ] Receive AI response
- [ ] Student AI Tutor functions (if available)

### Notifications
- [ ] View notifications page
- [ ] Notifications load correctly
- [ ] Click notification navigates to relevant page

### Role-Specific Features

#### Teacher
- [ ] Access teacher dashboard
- [ ] View created courses
- [ ] Request course validation
- [ ] View pending student validations
- [ ] Upload course content

#### University Admin
- [ ] Access university dashboard
- [ ] View pending course validations
- [ ] Approve/reject course validation
- [ ] View institutional analytics

#### Industry Professional
- [ ] Access industry dashboard
- [ ] View/create challenges
- [ ] Discover talent
- [ ] Send messages to students

#### Master Admin
- [ ] Access admin dashboard
- [ ] View platform metrics
- [ ] Access moderation tools

## Build Verification
- [ ] `npm run build` completes without errors
- [ ] `npm run check` (TypeScript) passes
- [ ] Application starts with `npm run dev`
- [ ] No console errors on page load

## API Health Checks
- [ ] `/api/auth/me` returns user data when logged in
- [ ] `/api/posts` returns feed posts
- [ ] `/api/courses` returns courses list
- [ ] `/api/notifications` returns notifications

---

**Last Verified:** [Date]
**Verified By:** [Name]
