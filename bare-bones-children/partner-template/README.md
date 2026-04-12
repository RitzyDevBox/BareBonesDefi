# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
   parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
   },
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list


inital deployment:  https://arweave.net/MzzPjf1mv1RJ0mwJWb1uQO4s906GXdCJeE5P_71o-fY

## GitHub Pages deployment (branch: `github-pages-release`)

- Sourcemaps are disabled in Vite build config (`build.sourcemap: false`).
- Deploy from your current branch with:

```bash
npm run deploy:github-pages
```

What this does:

1. Builds the app from your current branch.
2. Copies `dist/` into `github-pages-release` via a temporary git worktree.
3. Commits and pushes deployment artifacts to `origin/github-pages-release`.
4. Cleans up and keeps your working branch unchanged.