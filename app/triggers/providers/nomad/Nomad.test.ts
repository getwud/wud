// @ts-nocheck
import axios from 'axios';
import Nomad from './Nomad';
import log from '../../../log';

jest.mock('axios');

const configurationValid = {
    address: 'http://127.0.0.1:4646',
    alloclabel: 'com.hashicorp.nomad.alloc_id',
    tasklabel: 'com.hashicorp.nomad.task_name',
    alltasks: false,
    threshold: 'all',
    mode: 'simple',
    once: true,
    auto: true,
    simpletitle:
        'New ${container.updateKind.kind} found for container ${container.name}',
    simplebody:
        'Container ${container.name} running with ${container.updateKind.kind} ${container.updateKind.localValue} can be updated to ${container.updateKind.kind} ${container.updateKind.remoteValue}${container.result && container.result.link ? "\\n" + container.result.link : ""}',
    batchtitle: '${containers.length} updates available',
};

let nomad;

beforeEach(() => {
    nomad = new Nomad();
    nomad.configuration = configurationValid;
    nomad.log = log;
    jest.resetAllMocks();
});

test('validateConfiguration should apply defaults', () => {
    const validated = nomad.validateConfiguration({});
    expect(validated.address).toEqual('http://127.0.0.1:4646');
    expect(validated.alloclabel).toEqual('com.hashicorp.nomad.alloc_id');
    expect(validated.tasklabel).toEqual('com.hashicorp.nomad.task_name');
    expect(validated.alltasks).toEqual(false);
});

test('validateConfiguration should throw when address is not a valid uri', () => {
    expect(() =>
        nomad.validateConfiguration({ address: 'not-a-url' }),
    ).toThrow();
});

test('maskConfiguration should hide the token', () => {
    const masked = nomad.maskConfiguration({
        ...configurationValid,
        token: 'super-secret',
    });
    expect(masked.token).toEqual('_****_');
});

test('trigger should restart the allocation using the alloc/task labels', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const container = {
        name: 'romm',
        labels: {
            'com.hashicorp.nomad.alloc_id': 'alloc-123',
            'com.hashicorp.nomad.task_name': 'romm',
        },
    };

    await nomad.trigger(container);

    expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:4646/v1/client/allocation/alloc-123/restart',
        { TaskName: 'romm' },
        { headers: {} },
    );
});

test('trigger should send AllTasks when alltasks is enabled', async () => {
    axios.post.mockResolvedValue({ data: {} });
    nomad.configuration = { ...configurationValid, alltasks: true };

    const container = {
        name: 'romm',
        labels: {
            'com.hashicorp.nomad.alloc_id': 'alloc-123',
            'com.hashicorp.nomad.task_name': 'romm',
        },
    };

    await nomad.trigger(container);

    expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:4646/v1/client/allocation/alloc-123/restart',
        { AllTasks: true },
        { headers: {} },
    );
});

test('trigger should send the X-Nomad-Token header when a token is configured', async () => {
    axios.post.mockResolvedValue({ data: {} });
    nomad.configuration = { ...configurationValid, token: 'secret-token' };

    const container = {
        name: 'romm',
        labels: {
            'com.hashicorp.nomad.alloc_id': 'alloc-123',
            'com.hashicorp.nomad.task_name': 'romm',
        },
    };

    await nomad.trigger(container);

    expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:4646/v1/client/allocation/alloc-123/restart',
        { TaskName: 'romm' },
        { headers: { 'X-Nomad-Token': 'secret-token' } },
    );
});

test('trigger should fall back to parsing the task name from the container name when the label is missing', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const container = {
        name: 'audiobookshelf-alloc-123',
        labels: {
            'com.hashicorp.nomad.alloc_id': 'alloc-123',
        },
    };

    await nomad.trigger(container);

    expect(axios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:4646/v1/client/allocation/alloc-123/restart',
        { TaskName: 'audiobookshelf' },
        { headers: {} },
    );
});

test('trigger should refuse to restart implicitly when the task name cannot be determined', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const container = {
        name: 'some-unrelated-container-name',
        labels: {
            'com.hashicorp.nomad.alloc_id': 'alloc-123',
        },
    };

    await nomad.trigger(container);

    expect(axios.post).not.toHaveBeenCalled();
});

test('trigger should skip containers with no Nomad alloc label', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const container = { name: 'not-nomad', labels: {} };

    await nomad.trigger(container);

    expect(axios.post).not.toHaveBeenCalled();
});

test('trigger should propagate errors from the Nomad API', async () => {
    axios.post.mockRejectedValue(new Error('connection refused'));

    const container = {
        name: 'romm',
        labels: {
            'com.hashicorp.nomad.alloc_id': 'alloc-123',
            'com.hashicorp.nomad.task_name': 'romm',
        },
    };

    await expect(nomad.trigger(container)).rejects.toThrow(
        'connection refused',
    );
});

test('triggerBatch should restart every container allocation', async () => {
    axios.post.mockResolvedValue({ data: {} });

    const containers = [
        {
            name: 'romm',
            labels: {
                'com.hashicorp.nomad.alloc_id': 'alloc-123',
                'com.hashicorp.nomad.task_name': 'romm',
            },
        },
        {
            name: 'guacamole',
            labels: {
                'com.hashicorp.nomad.alloc_id': 'alloc-456',
                'com.hashicorp.nomad.task_name': 'guacamole',
            },
        },
    ];

    await nomad.triggerBatch(containers);

    expect(axios.post).toHaveBeenCalledTimes(2);
});
