import { Anonymous } from './Anonymous';

const anonymous = new Anonymous();

const configurationValid = {};

beforeEach(() => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        anonymous.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('getStrategy should return an Authentication strategy', () => {
    const strategy = anonymous.getStrategy();
    expect(strategy.name).toEqual('anonymous');
});
