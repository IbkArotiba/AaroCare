# Git Workflow for AaroCare

## Initial Setup (Already Done)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/AaroCare.git
git push -u origin main
```

## Daily Workflow
After making changes to your code:

1. Check which files have been modified:
```bash
git status
```

2. Add the files you want to commit:
```bash
git add <filename>  # Add specific files
# OR
git add .  # Add all changed files
```

3. Commit your changes:
```bash
git commit -m "Brief description of changes"
```

4. Push your changes to GitHub:
```bash
git push
```

## Important Security Notes
- Never commit .env files or other files containing secrets
- If you accidentally commit sensitive information, follow these steps to remove it:
  1. First, remove the sensitive file from git tracking:
     ```bash
     git rm --cached <file-with-sensitive-data>
     ```
  2. Commit this change:
     ```bash
     git commit -m "Remove sensitive file from git"
     ```
  3. Add the file to .gitignore to prevent future commits
  4. Push the changes:
     ```bash
     git push
     ```
  5. Consider changing any exposed secrets as they may still be in the git history

- For truly sensitive credentials, consider using environment variables or a secure credentials manager
