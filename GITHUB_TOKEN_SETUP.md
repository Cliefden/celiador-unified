# GitHub Token Setup for Git-Based Projects

## 🔑 Required: GitHub Personal Access Token

To enable full Git-based project functionality, you need a GitHub Personal Access Token.

### **Step 1: Create GitHub Token**

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: `Celiador Git Projects`
4. **Expiration**: No expiration (or 1 year)
5. **Select scopes**:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `user` (Read user profile data)
   - ✅ `admin:org` (if using organizations like celiador-repos)

6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

### **Step 2: Add Token to Environment**

Edit `/Users/scw/Private/Programming/bether/celiador-unified/.env`:

```bash
# GitHub Integration (required for Git-based projects)
GITHUB_ACCESS_TOKEN=ghp_your_actual_token_here
```

### **Step 3: Restart Services**

```bash
# Restart the backend service
cd celiador-unified
PORT=4000 npm run dev
```

### **Step 4: Test Project Creation**

- Create a new project with ecommerce-store template
- Should see successful repository creation logs
- `[slug]` routes will work perfectly! ✨

## 🏢 **Organization Setup (Optional)**

If you want to use the `celiador-repos` organization:

1. Create GitHub organization: https://github.com/organizations/new
2. Organization name: `celiador-repos`
3. Add your personal account as an owner
4. Make sure the token has `admin:org` permissions

## 🔒 **Security Notes**

- Keep your token secure
- Don't commit tokens to repositories
- Use environment variables only
- Consider using GitHub Apps for production

## 🎯 **Benefits of Git-Based Architecture**

- ✅ **No square bracket issues** - `[slug]` routes work perfectly
- ✅ **Version control** - Full Git history for every project
- ✅ **Collaboration** - Users can invite collaborators
- ✅ **Standard workflow** - Clone, commit, push, pull
- ✅ **No storage limits** - GitHub provides free repositories
- ✅ **Deploy anywhere** - Vercel, Netlify, Railway, etc.