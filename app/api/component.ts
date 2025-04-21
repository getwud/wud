import { byValues, byString } from 'sort-es';

import express, { Request, Response } from 'express';
import nocache from 'nocache';
import * as registry from '../registry';
import * as states from '../registry/states';
import { BaseConfig, Component, ComponentKind } from '../registry/Component';

export interface ComponentItem<T extends BaseConfig = BaseConfig> {
    id: string;
    type: string;
    name: string;
    configuration: T;
}

/**
 * Map a Component to a displayable (api/ui) item.
 * @param key
 * @param component
 */
function mapComponentToItem<T extends Component<TConfig>, TConfig extends BaseConfig>(key: string, component: T):
    ComponentItem<TConfig> {
    return {
        id: key,
        type: component.type,
        name: component.name,
        configuration: component.maskConfiguration(),
    };
}

/**
 * Return a list instead of a map.
 * @param listFunction
 */
export function mapComponentsToList<T extends Component<TConfig>, TConfig extends BaseConfig>(components: { [key: string]: T })
    : ComponentItem<TConfig>[] {
    return Object.keys(components)
        .map((key) => mapComponentToItem<T, TConfig>(key, components[key]))
        .sort(
            byValues([
                [(x) => x.type, byString()],
                [(x) => x.name, byString()],
            ]),
        );
}

/**
 * Get all components.
 * @param req
 * @param res
 */
function getAll(req: Request, res: Response, kind: ComponentKind) {
    res.status(200).json(mapComponentsToList<Component<any>, BaseConfig>(states.getState()[kind]));
}

/**
 * Get a component by id.
 * @param req
 * @param res
 * @param listFunction
 */
export function getById(req: Request, res: Response, kind: ComponentKind) {
    const { type, name } = req.params;
    const id = `${type}.${name}`;
    const component = states.getState()[kind][id];
    if (component) {
        res.status(200).json(mapComponentToItem<Component<any>, BaseConfig>(id, component));
    } else {
        res.sendStatus(404);
    }
}

/**
 * Init the component router.
 * @param kind
 */
export function init(kind: ComponentKind) {
    const router = express.Router();
    router.use(nocache());
    router.get('/', (req, res) => getAll(req, res, kind));
    router.get('/:type/:name', (req, res) => getById(req, res, kind));
    return router;
}