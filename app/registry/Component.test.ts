import { Component } from './Component';

beforeEach(() => {
    jest.resetAllMocks();
});

test('mask should mask with * when called with defaults', () => {
    expect(Component.mask('abcdefgh')).toStrictEqual('a******h');
});

test('mask should mask with § when called with § masking char', () => {
    expect(Component.mask('abcdefgh', 1, '§')).toStrictEqual('a§§§§§§h');
});

test('mask should mask with § and keep 3 chars when called with § masking char and a number of 3', () => {
    expect(Component.mask('abcdefgh', 3, '§')).toStrictEqual('abc§§fgh');
});

test('mask should return undefined when value is undefined', () => {
    expect(Component.mask(undefined)).toStrictEqual(undefined);
});

test('mask should not fail when mask is longer than original string', () => {
    expect(Component.mask('abc', 5)).toStrictEqual('***');
});

test('getId should return the concatenation $type.$name', () => {
    const component = new Component();
    component.register('trigger', 'type', 'name', { x: 'x' });
    expect(component.getId()).toEqual('type.name');
});

test('register should call validateConfiguration and init methods of the component', () => {
    const component = new Component();
    const spyValidateConsiguration = jest.spyOn(
        component,
        'validateConfiguration',
    );
    const spyInit = jest.spyOn(component, 'init');
    component.register('trigger', 'type', 'name', { x: 'x' });
    expect(spyValidateConsiguration).toHaveBeenCalledWith({ x: 'x' });
    expect(spyInit).toHaveBeenCalledTimes(1);
});

test('register should not call init when validateConfiguration fails', () => {
    const component = new Component();
    component.validateConfiguration = () => {
        throw new Error('validation failed');
    };
    const spyInit = jest.spyOn(component, 'init');
    expect(component.register('trigger', 'name', '', { x: 'x' })).rejects.toThrowError(
        'validation failed',
    );
    expect(spyInit).toHaveBeenCalledTimes(0);
});

test('register should throw when init fails', () => {
    const component = new Component();
    component.init = () => {
        throw new Error('init failed');
    };
    expect(component.register('trigger', 'name', '', { x: 'x' })).rejects.toThrowError(
        'init failed',
    );
});
