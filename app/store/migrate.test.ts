// @ts-nocheck
import * as container from './container';

jest.mock('./container');

container.getContainers = () => [
    {
        name: 'container1',
    },
    {
        name: 'container2',
    },
];

import * as migrate from './migrate';

beforeEach(async () => {
    jest.resetAllMocks();
});

test('migrate should delete all containers when from is lower than 8 and to is grater than 8', async () => {
    const spy = jest.spyOn(container, 'deleteContainer');
    migrate.migrate('7.0.0', '8.0.0');
    expect(spy).toHaveBeenCalledTimes(2);
});

test('migrate should not delete all containers when from is from and to are 8 versions', async () => {
    const spy = jest.spyOn(container, 'deleteContainer');
    migrate.migrate('8.1.0', '8.2.0');
    expect(spy).not.toHaveBeenCalled();
});
