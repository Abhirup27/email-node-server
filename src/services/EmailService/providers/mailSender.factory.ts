import {MailSenderA} from "./mailSenderA.provider";
import {MailSenderB} from "./mailSenderB.provider";

export enum MailProvider {
    Provider1 = 'ProviderA',
    Provider2 = 'ProviderB',
    Provider3 = 'ProviderC',
}


export function createMailProvider(provider: MailProvider) {
    switch (provider) {
        case MailProvider.Provider1:
            return new MailSenderA();
        case MailProvider.Provider2:
            return new MailSenderB();
        default:
            throw new Error(`Invalid provider: ${provider}`);
    }
}