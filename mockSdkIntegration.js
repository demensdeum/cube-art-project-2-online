import { SdkIntegration } from './sdkIntegration.js'

export class MockSdkIntegration extends SdkIntegration {
    constructor(delegate) {
        super(delegate)
        this.delegate = delegate
        document._global_mockSdkIntegration = this
    }
    load() {
        console.log("mock sdk load")
        console.log(`this.delegate: ${this.delegate}`)
        const self = this;
        setTimeout(()=>{self.init(new Object())}, 3000)
    }

    init(script) {
        const self = document._global_mockSdkIntegration
        console.log(`self.delegate: ${self.delegate}`)
        self.delegate.sdkIntegrationInitialized(self)
        self.delegate.sdkIntegrationLanguageSwitched(self, 'ru')
    }
}
