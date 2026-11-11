import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ContainerImage } from '../../../model/container';
import DockerRegistryV2 from '../../DockerRegistryV2';
import { RegistryTagsList } from '../../Registry';
import { AnySchema } from 'joi';

/**
 * Github Container Registry integration.
 */
class Ghcr extends DockerRegistryV2 {
    protected registryPattern = /^.*\.?ghcr.io$/;

    getConfigurationSchema(): AnySchema {
        return this.joi.alternatives([
            this.joi.string().allow(''),
            this.joi.object().keys({
                username: this.joi.string().required(),
                token: this.joi.string().required(),
                semvercursor: this.joi.boolean().default(true),
            }),
            this.joi.object().keys({
                semvercursor: this.joi.boolean().required(),
            }),
        ]);
    }

    async authenticate(
        image: ContainerImage,
        requestOptions: AxiosRequestConfig,
    ) {
        const token = Buffer.from(
            this.configuration.token || ':',
            'utf-8',
        ).toString('base64');
        return this.authenticateBearer(requestOptions, token);
    }

    async getTags(image: ContainerImage): Promise<string[]> {
        const cachedTags = this.getCachedTags(image);
        if (cachedTags) {
            this.log.debug(
                `Tag cache hit for ${image.name} (${cachedTags.length} tags)`,
            );
            return cachedTags;
        }

        const currentTag = image.tag?.value;
        const useSemverCursor =
            this.configuration.semvercursor !== false &&
            currentTag !== undefined &&
            currentTag !== '' &&
            currentTag !== 'latest';

        if (!useSemverCursor) {
            return super.getTags(image);
        }

        this.log.debug(
            `Get ${image.name} tags starting from cursor ${currentTag}`,
        );

        let page: AxiosResponse<RegistryTagsList> | undefined;
        try {
            page = await this.getTagsPage(image, currentTag);
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return super.getTags(image);
            }
            throw error;
        }

        const initialTags =
            page && page.data && page.data.tags ? page.data.tags : [];

        if (initialTags.length === 0) {
            const exists = await this.hasTag(image, currentTag);
            if (exists) {
                this.log.debug(
                    `${image.name}:${currentTag} is up to date (no newer tags after cursor)`,
                );
                const upToDateTags = [currentTag];
                this.setCachedTags(image, upToDateTags, currentTag);
                return upToDateTags;
            }
            this.log.debug(
                `${image.name}:${currentTag} not found remotely; falling back to full tag scan`,
            );
            return super.getTags(image);
        }

        // Tags returned > 0: paginate remaining pages (if any) passing first page
        const tags = await this.paginateTags(image, page);
        this.setCachedTags(image, tags, currentTag);
        return tags;
    }
}

export default Ghcr;
