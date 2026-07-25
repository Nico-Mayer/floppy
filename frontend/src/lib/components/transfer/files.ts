export function basename(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
}

export function ext(path: string): string {
    const name = basename(path);
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : "FILE";
}
