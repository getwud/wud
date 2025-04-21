import { Container } from "../model/container";
import { BaseConfig, Component } from "../registry/Component";

export class Watcher<T extends BaseConfig = {}> extends Component<T> {
    async watch(): Promise<any> {
        throw new Error("Method not implemented.");
    }

    async getContainers(): Promise<Container[]> {
        throw new Error("Method not implemented.");
    }

    async watchContainer(container: Container): Promise<{
        container: Container;
        changed?: boolean;
    }> {
        throw new Error("Method not implemented.");
    }
}