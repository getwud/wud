import 'dockerode';

declare module 'dockerode' {
    interface ImageInspectInfo {
        Variant: string;
    }
}