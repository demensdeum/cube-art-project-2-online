import { SdkIntegration} from './sdkIntegration.js'

export class YandexSdkIntegration extends SdkIntegration {
    constructor(delegate) {
        super(delegate)
        this.delegate = delegate
        document._global_yandexSdkIntegration = this
    }
    load() {
        console.log("yandex sdk load")
        console.log(`this.delegate: ${this.delegate}`)
        const self = this;
        (function(doc) {
            var script = doc.createElement('script');
            script.src = "/sdk.js";
            script.async = true;
            script.onload = self.init
            doc.body.append(script);
        })(document);
    }

    init(script) {
        const self = document._global_yandexSdkIntegration
        console.log(`self.delegate: ${self.delegate}`)
        if (window.YaGames) {
            window.YaGames
            .init()
            .then(ysdk => {
                window.ysdk = ysdk;
                self.delegate.sdkIntegrationInitialized(self)
                self.delegate.sdkIntegrationLanguageSwitched(self, ysdk.environment.i18n.lang)
            })
        }
    }
}
