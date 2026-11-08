import { Container, ContainerImage, ContainerResult } from '../model/container';
import { Registry, RegistryManifest } from '../registries/Registry';
import * as storeContainer from '../store/container';

export async function resolveAndCacheImageConfig(
    registryProvider: Registry,
    container: Container,
    image: ContainerImage,
    manifestDigest: string,
    configDigest: string | undefined,
    result: ContainerResult,
    isMatchCached: (prev: ContainerResult) => boolean,
    logContainer?: { debug?: (msg: any) => void },
): Promise<void> {
    const previousResult = storeContainer.getContainer(container.id)?.result;
    if (previousResult && isMatchCached(previousResult)) {
        if (result.created === undefined) {
            result.created = previousResult.created;
        }
        if (!result.version && previousResult.version) {
            result.version = previousResult.version;
        }
        return;
    }

    if (typeof registryProvider.getImageConfig !== 'function') {
        return;
    }

    try {
        const remoteConfig = await registryProvider.getImageConfig(
            image,
            manifestDigest,
            configDigest,
        );
        result.created = remoteConfig.created ?? result.created;
        if (!result.version && remoteConfig.version) {
            result.version = remoteConfig.version;
        }
    } catch (e: any) {
        if (logContainer && typeof logContainer.debug === 'function') {
            logContainer.debug(`Cannot get remote image config (${e.message})`);
        }
    }
}

export interface ResolveCandidateConfigOptions {
    registryProvider: Registry;
    container: Container;
    candidateTag: string;
    candidateRemoteDigest?: RegistryManifest;
    result: ContainerResult;
    logContainer?: { debug?: (msg: any) => void };
}

export async function resolveCandidateConfig(
    options: ResolveCandidateConfigOptions,
): Promise<void> {
    const {
        registryProvider,
        container,
        candidateTag,
        candidateRemoteDigest,
        result,
        logContainer,
    } = options;

    if (result.created === undefined && candidateRemoteDigest?.created) {
        result.created = candidateRemoteDigest.created;
    }

    if (
        result.created !== undefined ||
        candidateRemoteDigest?.version === 1 ||
        !candidateRemoteDigest?.digest
    ) {
        return;
    }

    const candidateImage: ContainerImage = {
        ...container.image,
        tag: {
            ...container.image.tag,
            value: candidateTag,
        },
    };

    await resolveAndCacheImageConfig(
        registryProvider,
        container,
        candidateImage,
        candidateRemoteDigest.digest,
        candidateRemoteDigest.configDigest,
        result,
        (prev) =>
            Boolean(
                (prev.digest && prev.digest === candidateRemoteDigest.digest) ||
                    (prev.tag === candidateTag && prev.created !== undefined),
            ),
        logContainer,
    );
}

export interface ResolveDigestConfigOptions {
    registryProvider: Registry;
    container: Container;
    imageToGetDigestFrom: ContainerImage;
    remoteDigest?: RegistryManifest;
    result: ContainerResult;
    logContainer?: { debug?: (msg: any) => void };
}

export async function resolveDigestConfig(
    options: ResolveDigestConfigOptions,
): Promise<void> {
    const {
        registryProvider,
        container,
        imageToGetDigestFrom,
        remoteDigest,
        result,
        logContainer,
    } = options;

    if (
        remoteDigest?.version === 1 ||
        result.digest === undefined ||
        container.image.digest?.value === result.digest
    ) {
        return;
    }

    await resolveAndCacheImageConfig(
        registryProvider,
        container,
        imageToGetDigestFrom,
        result.digest,
        remoteDigest?.configDigest,
        result,
        (prev) => prev.digest === result.digest,
        logContainer,
    );
}
