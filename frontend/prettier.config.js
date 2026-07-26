import { fileURLToPath } from 'node:url'

const plugin = (name) => fileURLToPath(import.meta.resolve(name))

/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 110,
	semi: false,
	plugins: [plugin('prettier-plugin-svelte'), plugin('prettier-plugin-tailwindcss')],
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
	tailwindStylesheet: fileURLToPath(import.meta.resolve('./src/app.css'))
}

export default config
