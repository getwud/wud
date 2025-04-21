import { ValidationError } from 'joi';
import { Basic, BasicConfiguration } from './Basic';

const configurationValid = {
    user: 'john',
    hash: '$apr1$8zDVtSAY$62WBh9DspNbUKMZXYRsjS/',
};

const basic = new Basic();
basic.configuration = configurationValid;

beforeEach(() => {
    jest.resetAllMocks();
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration =
        basic.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {} as BasicConfiguration;
    expect(() => {
        basic.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('getStrategy should return an Authentication strategy', () => {
    const strategy = basic.getStrategy();
    expect(strategy.name).toEqual('basic');
});

test('maskConfiguration should mask configuration secrets', () => {
    expect(basic.maskConfiguration()).toEqual({
        user: 'john',
        hash: '$***********************************/',
    });
});

test('authenticate should reject user when unknown', (done) => {
    basic.authenticate('jane', 'doe', (err, user) => {
        expect(err).toBeNull();
        expect(user).toBeFalsy();
        done();
    });
});

test('authenticate should reject user when bad password', (done) => {
    basic.authenticate('john', 'nope', (err, user) => {
        expect(err).toBeNull();
        expect(user).toBeFalsy();
        done();
    });
});

test('authenticate should return user when right password', (done) => {
    basic.authenticate('john', 'doe', (err, user) => {
        expect(err).toBeNull();
        expect(user).toEqual({
            username: 'john',
        });
        done();
    });
});
