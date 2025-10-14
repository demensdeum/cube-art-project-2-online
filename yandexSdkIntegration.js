import { SdkIntegration} from './sdkIntegration.js'

export class YandexSdkIntegration extends SdkIntegration {
    load() {
        console.log("yandex sdk load")
        const self = this;
        (function(doc) {
            var script = doc.createElement('script');
            script.src = "https://sdk.games.s3.yandex.net/sdk.js";
            script.async = true;
            script.onload = self.init
            doc.body.append(script);
        })(document);
    }

    init(script) {
        if (window.YaGames) {
            window.YaGames
            .init()
            .then(ysdk => {
                window.ysdk = ysdk;
                this.delegate.SdkIntegrationInitialized(this)
                this.delegate.SdkIntegrationLanguageSwitched(this, ysdk.environment.i18n.lang)
            })
        }
    }
}
