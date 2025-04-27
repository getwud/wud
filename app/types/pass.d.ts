declare module 'pass' {
    export function validate(
        password: string,
        hash: string,
        callback: (err: Error | null, success: boolean) => void
    ): void;
}