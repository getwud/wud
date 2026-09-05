// @ts-nocheck
import express from 'express';
import nocache from 'nocache';
import * as storeApp from '../store/app';

export function getAppInfos(req, res) {
    res.status(200).json(storeApp.getAppInfos());
}
