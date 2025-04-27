
jest.mock('./container', () => ({
    ...jest.requireActual('./container'),
    getContainers: jest.fn((args?: container.Query) => [
        {
            name: 'container1',
        },
        {
            name: 'container2',
        },
    ]),
    deleteContainer: jest.fn(),
}));
import * as container from './container';
import * as migrate from './migrate';

afterEach(() => {
    jest.clearAllMocks();
});

test('migrate should delete all containers when from is lower than 8 and to is greater than 8', () => {
    const spy = jest.spyOn(container, 'deleteContainer');
    migrate.migrate('7.0.0', '8.0.0');
    expect(spy).toHaveBeenCalledTimes(2);
});

test('migrate should not delete all containers when from is from and to are 8 versions', () => {
    const spy = jest.spyOn(container, 'deleteContainer');
    migrate.migrate('8.1.0', '8.2.0');
    expect(spy).not.toHaveBeenCalled();
});
