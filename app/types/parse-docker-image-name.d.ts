declare module 'parse-docker-image-name' {
    interface ParsedDockerImage {
        domain?: string;
        path?: string;
        tag?: string;
        digest?: string;
    }

    /**
     * Parses a Docker image name and returns its components.
     * @param image The Docker image name as a string or an array of strings.
     * @returns An object (or an array of objects) containing the parsed components.
     */
    function parse(image: string): ParsedDockerImage;
    function parse(image: string[]): ParsedDockerImage[];

    export = parse;
}