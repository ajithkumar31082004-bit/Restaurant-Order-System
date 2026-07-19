## 📋 Pull Request Checklist

### Description
<!-- Briefly describe what this PR does and why. -->

**Type of change:**
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] ♻️ Refactor
- [ ] 🔧 Config / DevOps change
- [ ] 📝 Documentation update

---

### Testing
- [ ] Tested locally (`npm run dev`)
- [ ] API endpoints tested (manually or with Postman)
- [ ] No console errors in the browser
- [ ] Database migrations / schema changes documented

### Code Quality
- [ ] No hardcoded secrets or API keys
- [ ] `.env.example` updated if new environment variables were added
- [ ] Error handling in place for new code paths
- [ ] Existing routes and features still work

### DevOps / Deployment
- [ ] `ecosystem.config.js` updated if startup behavior changes
- [ ] `Dockerfile` or `docker-compose.yml` updated if new dependencies were added
- [ ] Nginx config updated if new routes need special handling
- [ ] Terraform files updated if new AWS resources were added

---

### Screenshots (if UI changes)
<!-- Paste before/after screenshots here if applicable -->

### Related Issues
<!-- Closes #issue_number -->
