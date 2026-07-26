/** Short uppercase extension for the file-row badge, e.g. "PNG". */
export function ext(path: string): string {
	const name = path.split(/[\\/]/).pop() ?? path
	const dot = name.lastIndexOf('.')
	return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : 'FILE'
}
