// @ts-nocheck
import * as component from './component';

export function getWatchers(req, res) {
    return component.getAll(req, res, 'watcher');
}

export function getWatcher(req, res) {
    return component.getById(req, res, 'watcher');
}
