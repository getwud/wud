// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { store } from '../store';

export function getStore(req, res) {
    nocache()(req, res, () => {
        res.status(200).json({
            configuration: store.getConfiguration(),
        });
    });
}
