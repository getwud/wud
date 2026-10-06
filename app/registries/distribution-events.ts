import joi from 'joi';
import { RegistryPushHint } from './Registry';
const hostPattern = /^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/;
const manifestTypes = new Set([
    'application/vnd.docker.distribution.manifest.v2+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.oci.image.index.v1+json',
]);
const envelopeSchema = joi
    .object({
        events: joi
            .array()
            .max(100)
            .items(
                joi
                    .object({
                        action: joi.string().required(),
                        target: joi.object().required().unknown(true),
                        request: joi.object().unknown(true),
                    })
                    .unknown(true),
            )
            .required(),
    })
    .unknown(true);
const pushSchema = joi
    .object({
        repository: joi
            .string()
            .pattern(
                /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*)*$/,
            )
            .max(255)
            .required(),
        tag: joi
            .string()
            .pattern(/^[\w][\w.-]{0,127}$/)
            .required(),
        digest: joi
            .string()
            .pattern(/^sha256:[a-fA-F0-9]{64}$/)
            .required(),
        mediaType: joi.string().required(),
        url: joi.string().uri({ scheme: ['http', 'https'] }),
    })
    .unknown(true);

export function parseDistributionEvents(body: unknown): RegistryPushHint[] {
    const envelope = envelopeSchema.validate(body);
    if (envelope.error) throw envelope.error;
    const hints: RegistryPushHint[] = [];
    for (const item of envelope.value.events) {
        if (
            item.action !== 'push' ||
            !manifestTypes.has(item.target.mediaType) ||
            !item.target.tag
        )
            continue;
        const target = pushSchema.validate(item.target);
        if (target.error) throw target.error;
        let host: string;
        if (target.value.url) {
            const url = new URL(target.value.url);
            if (url.username || url.password)
                throw new Error('Invalid registry URL');
            host = url.host;
        } else {
            host = item.request?.host;
        }
        if (!host || !hostPattern.test(host))
            throw new Error('Invalid registry host');
        hints.push({
            host: host.toLowerCase(),
            repository: target.value.repository,
            tag: target.value.tag,
            digest: target.value.digest,
        });
    }
    return hints;
}
