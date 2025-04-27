import { TriggerConfiguration } from '../Trigger';


export interface MqttConfiguration extends TriggerConfiguration {
    url: string;
    topic: string;
    clientid: string;
    user?: string;
    password?: string;
    hass: {
        enabled: boolean;
        prefix: string;
        discovery: boolean;
    };
    tls: {
        clientkey?: string;
        clientcert?: string;
        cachain?: string;
        rejectunauthorized: boolean;
    };
}
