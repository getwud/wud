import { BasicStrategy } from './BasicStrategy';

const basicStrategy = new BasicStrategy({}, () => { }) as any;

beforeEach(() => {
    basicStrategy.success = jest.fn();
    basicStrategy.fail = jest.fn();
});

test('_challenge should return appropriate Auth header', () => {
    expect(basicStrategy._challenge()).toEqual(401);
});

test('authenticate should return user from session if so', () => {
    basicStrategy.authenticate({ isAuthenticated: () => true });
    expect(basicStrategy.success).toHaveBeenCalled();
});

test('authenticate should call super.authenticate when no existing session', () => {
    const fail = jest.spyOn(basicStrategy, 'fail');
    basicStrategy.authenticate({
        isAuthenticated: () => false,
        headers: {
            Authorization: 'Bearer XXXXX',
        },
    });
    expect(fail).toHaveBeenCalled();
});
