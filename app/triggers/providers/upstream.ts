import { Container, fullName } from '../../model/container';

/**
 * Trigger types that update a container by pulling its image and recreating
 * or restarting it. They cannot update a locally built image: pulling the
 * upstream image and recreating the container from it would silently drop
 * the local customizations. Kept in sync with PULL_BASED_TRIGGER_TYPES in
 * ui/src/components/ContainerUpdateDialog.vue.
 */
export const PULL_BASED_TRIGGER_TYPES = ['docker', 'dockercompose', 'nomad'];

/**
 * Return the reason why a pull-based trigger must refuse this container, or
 * undefined when the update can proceed (container not tracking an upstream
 * image).
 */
export function getUpstreamRefusalReason(
    container: Container,
    triggerType: string,
): string | undefined {
    const upstream = container?.image?.upstream;
    if (!upstream) {
        return undefined;
    }
    return `Container ${fullName(container)} tracks upstream image ${upstream.ref}; the ${triggerType} trigger cannot update a locally built image (rebuild it from the new upstream version instead)`;
}
