// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import { getServerConfiguration } from '../configuration';

export function getServer(req, res) {
    res.status(200).json({
        configuration: getServerConfiguration(),
    });
}
