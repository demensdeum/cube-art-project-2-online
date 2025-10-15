import { SdkIntegration } from './sdkIntegration.js'

export class EmptySdkIntegration extends SdkIntegration {
    constructor(delegate) {
        super(delegate)
    }
    load() {
    }

    init(script) {
    }
}
