# Ruptor Tailwind CSS Extension

The Tailwind CSS extension for [Ruptor](https://ruptor.net).

## Installation

1. Inside your Ruptor project, run `npm install -D @ruptor/tailwind`
2. Add **@ruptor/tailwind** to the extension field inside `ruptor.config.js`.

```js
export default {
  extensions: [
    '@ruptor/tailwind'
  ]
}
```

## Changelog

### 0.4.0
- Updated to Tailwind CSS 3.0.6
- Removed `jit` mode in config since it's enabled by default
- Replaced `purge` with the new `content` option
- Removed `fs-extra` dependency to use Ruptor extension's new built-in util fs helper
- Added `.json` files in /pages directory and `.js` files /components directory to watch for Tailwind CSS class names